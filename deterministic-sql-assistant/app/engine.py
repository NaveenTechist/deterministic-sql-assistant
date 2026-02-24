import os
import re
import logging
import time
import asyncpg
from typing import Optional, List, Dict, Any, Tuple
from pydantic import BaseModel
from dotenv import load_dotenv

# --- LOGGING CONFIGURATION ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("assistant_engine.log")
    ]
)
logger = logging.getLogger("DeterministicSQLAssistant")

# --- CONFIGURATION ---
load_dotenv(".env")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://chatbot_readonly:chatbot123@localhost:5433/nyx")
ALLOWED_TABLES = ["ccod_bal"]
COLUMN_MAPPING = {
    "customer": "cust_name",
    "name": "cust_name",
    "account": "accountno",
    "acc_no": "accountno",
    "balance": "currentbalance",
    "amt": "currentbalance",
    "interest": "intrate",
    "rate": "intrate",
    "branch_no": "branchno",
    "branch_name": "branch_name",
    "br_no": "branchno",
    "brname": "branch_name"
}

# --- MODELS ---
class QueryRequest(BaseModel):
    """Pydantic model for incoming query requests."""
    query: str

class QueryResponse(BaseModel):
    """Pydantic model for standardized API responses."""
    success: bool
    data: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None
    sql: Optional[str] = None
    execution_time_ms: Optional[float] = None

# --- SECURITY ---
FORBIDDEN_KEYWORDS = [
    "insert", "update", "delete", "drop", "truncate", "alter", 
    "create", "grant", "revoke", "exec", "execute"
]

class SecurityManager:
    """Handles SQL injection protection and keyword whitelisting."""

    def validate_query(self, sql: str) -> Tuple[bool, Optional[str]]:
        """
        Validates if the generated SQL is safe for execution.
        
        Args:
            sql: The SQL query string to validate.
            
        Returns:
            A tuple of (is_valid, error_message).
        """
        sql_lower = sql.lower()
        
        # 1. Enforce SELECT-only
        if not re.match(r"^\s*(select|with)\b", sql_lower):
            logger.warning(f"Security Rejection: Non-SELECT query attempted: {sql[:50]}...")
            return False, "Only SELECT queries are allowed."
            
        # 2. Prevent forbidden DDL/DML keywords
        for keyword in FORBIDDEN_KEYWORDS:
            if re.search(rf"\b{keyword}\b", sql_lower):
                logger.warning(f"Security Rejection: Forbidden keyword '{keyword}' detected.")
                return False, f"Forbidden keyword detected: {keyword.upper()}"
                
        # 3. Prevent multi-statement queries
        if ";" in sql.strip().rstrip(";"):
            logger.warning("Security Rejection: Multi-statement query attempted.")
            return False, "Multi-statement queries are forbidden."
            
        return True, None

# --- DETERMINISTIC CORE ---
class DeterministicCore:
    """Core logic for parsing user intent and building safe SQL queries."""
    
    def __init__(self):
        # Regex to extract numeric account numbers (10 to 20 digits)
        self.re_account = re.compile(r"(\d{10,20})")
        self.table = ALLOWED_TABLES[0]

    def parse_and_build(self, text: str) -> Tuple[str, List[Any]]:
        """
        Parses user text to extract entities and build a parameterized SQL query.
        
        Args:
            text: The raw user prompt.
            
        Returns:
            A tuple of (sql_query, parameters).
        """
        text_lower = text.lower()
        
        # 1. Extract Entity (Account Number)
        acc_match = self.re_account.search(text_lower)
        account_no = acc_match.group(1) if acc_match else None
        
        # 2. Map Keywords to Database Columns
        extracted_cols = []
        if any(w in text_lower for w in ["name", "customer"]): 
            extracted_cols.append(COLUMN_MAPPING["name"])
        if any(w in text_lower for w in ["balance", "amount", "amt"]): 
            extracted_cols.append(COLUMN_MAPPING["balance"])
        if any(w in text_lower for w in ["interest", "rate"]): 
            extracted_cols.append(COLUMN_MAPPING["interest"])
        if any(w in text_lower for w in ["branch", "br_no", "brname"]): 
            extracted_cols.extend([COLUMN_MAPPING["br_no"], COLUMN_MAPPING["brname"]])

        # Deduplicate and format columns
        cols = ", ".join(set(extracted_cols)) if extracted_cols else "*"
        
        # 3. Build Parameterized Query
        if account_no:
            try:
                # Convert to integer for BIGINT compatibility
                acc_int = int(account_no)
                sql = f"SELECT {cols} FROM {self.table} WHERE accountno = $1"
                return sql, [acc_int]
            except ValueError:
                # Fallback to string if conversion fails (unlikely due to regex)
                sql = f"SELECT {cols} FROM {self.table} WHERE accountno = $1"
                return sql, [account_no]
        
        # Default behavior: Search with limit if no account identifier found
        return f"SELECT {cols} FROM {self.table} LIMIT 10", []

# --- ENGINE ---
class DeterministicEngine:
    """Orchestrates the retrieval process: Connect -> Parse -> Build -> Validate -> Execute."""
    
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self.security = SecurityManager()
        self.core = DeterministicCore()

    async def connect(self):
        """Initializes the database connection pool."""
        if not self.pool:
            try:
                logger.info("Initializing database connection pool...")
                self.pool = await asyncpg.create_pool(DATABASE_URL)
                logger.info("Database pool established successfully.")
            except Exception as e:
                logger.error(f"Failed to connect to database: {str(e)}", exc_info=True)
                raise

    async def disconnect(self):
        """Closes the database connection pool."""
        if self.pool:
            logger.info("Closing database connection pool...")
            await self.pool.close()
            logger.info("Database pool closed.")

    async def process_query(self, user_query: str) -> QueryResponse:
        """
        Processes a user query and returns a structured response.
        
        Args:
            user_query: The natural language string from the user.
            
        Returns:
            A QueryResponse object containing data, SQL, and status.
        """
        start_time = time.time()
        logger.info(f"Incoming Request: '{user_query}'")
        
        try:
            # 1. Parse and Build SQL
            sql, params = self.core.parse_and_build(user_query)
            
            # 2. Security Validation
            is_valid, sec_error = self.security.validate_query(sql)
            if not is_valid:
                return QueryResponse(success=False, error=sec_error, sql=sql)

            # 3. Ensure DB Connectivity
            if not self.pool:
                await self.connect()

            # 4. Execute with Read-Only Transaction
            async with self.pool.acquire() as conn:
                async with conn.transaction(readonly=True):
                    logger.info(f"Executing Deterministic SQL: {sql} | Params: {params}")
                    rows = await conn.fetch(sql, *params)
                    
            execution_time = (time.time() - start_time) * 1000
            logger.info(f"Query successful. Found {len(rows)} rows in {execution_time:.2f}ms")
            
            return QueryResponse(
                success=True, 
                data=[dict(r) for r in rows], 
                sql=sql,
                execution_time_ms=round(execution_time, 2)
            )

        except asyncpg.PostgresError as pg_err:
            logger.error(f"Database Error: {str(pg_err)}", exc_info=True)
            return QueryResponse(success=False, error=f"Database Retrieval Error: {str(pg_err)}", sql=locals().get('sql'))
            
        except Exception as e:
            logger.error(f"Unexpected Engine Error: {str(e)}", exc_info=True)
            return QueryResponse(success=False, error="An internal processing error occurred.")

# Global shared instance
engine = DeterministicEngine()
