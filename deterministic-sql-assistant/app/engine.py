import os
import re
import logging
import time
import asyncpg
import httpx
import json
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
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://chatbot_readonly:chatbot123@localhost:5433/reconciliation")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")

ALLOWED_TABLES = ["bgl_txn"]
COLUMN_MAPPING = {
    "account": "acc_no",
    "acc_no": "acc_no",
    "bgl_no": "bgl_no",
    "balance": "balance",
    "amount": "balance",
    "debit": "debit_amount",
    "dr cr": "dr_cr",
    "statement narration": "statement_narration",
    "credit": "credit_amount",
    "description": "bgl_description",
    "branch": "branch_code",
    "date": "post_date",
    "trace": "trace_no",
    "type": "type_no",
    "txn code": "txn_code",
    "post date": "post_date",
    "trace number": "trace_no",
    "rrn": "rrn",
    "v id": "v_id"
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
    method: Optional[str] = None # "fast" or "llm"

# --- SECURITY ---
FORBIDDEN_KEYWORDS = [
    "insert", "update", "delete", "drop", "truncate", "alter", 
    "create", "grant", "revoke", "exec", "execute"
]

class SecurityManager:
    """Handles SQL injection protection and keyword whitelisting."""

    def validate_query(self, sql: str) -> Tuple[bool, Optional[str]]:
        sql_lower = sql.lower()
        if not re.match(r"^\s*(select|with)\b", sql_lower):
            return False, "Only SELECT queries are allowed."
        for keyword in FORBIDDEN_KEYWORDS:
            if re.search(rf"\b{keyword}\b", sql_lower):
                return False, f"Forbidden keyword detected: {keyword.upper()}"
        if ";" in sql.strip().rstrip(";"):
            return False, "Multi-statement queries are forbidden."
        return True, None

# --- LLM INTENT EXTRACTION ---
class LLMManager:
    """Handles requests to Ollama for intent extraction."""
    
    def __init__(self):
        self.api_url = f"{OLLAMA_URL}/api/generate"
        self.model = OLLAMA_MODEL

    async def extract_intent(self, user_query: str) -> Dict[str, Any]:
        """Ask LLM to parse user query into structured search parameters."""
        prompt = f"""
        Analyze this bank transaction query: "{user_query}"
        Extract parameters for a SQL search on table 'bgl_txn'.
        Available columns: {list(COLUMN_MAPPING.values())}
        
        Respond ONLY with a JSON object:
        {{
          "acc_no": "value or null",
          "columns": ["list", "of", "columns"],
          "filters": {{"column": "value"}},
          "limit": count
        }}
        """
        
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }
        
        try:
            logger.info(f"Requesting LLM intent for: {user_query}")
            async with httpx.AsyncClient() as client:
                response = await client.post(self.api_url, json=payload, timeout=30.0)
                if response.status_code == 200:
                    return json.loads(response.json()['response'])
        except Exception as e:
            logger.error(f"LLM extraction failed: {str(e)}")
        
        return {}

# --- DETERMINISTIC CORE ---
class DeterministicCore:
    """Core logic for parsing user intent and building safe SQL queries."""
    
    def __init__(self):
        self.re_account = re.compile(r"(\d{10,20})")
        self.table = ALLOWED_TABLES[0]

    def is_simple_query(self, text: str) -> bool:
        """Determines if a query can be handled by the Fast Path (regex/keyword)."""
        text_lower = text.lower()
        # If it's just an account number or simple balance check
        if self.re_account.search(text_lower) and len(text.split()) < 6:
            return True
        return False

    def build_fast_sql(self, text: str) -> Tuple[str, List[Any]]:
        """Fast-path SQL building using regex."""
        text_lower = text.lower()
        acc_match = self.re_account.search(text_lower)
        account_no = acc_match.group(1) if acc_match else None
        
        extracted_cols = []
        for key, col in COLUMN_MAPPING.items():
            if key in text_lower:
                extracted_cols.append(col)

        cols = ", ".join(set(extracted_cols)) if extracted_cols else "*"
        
        if account_no:
            return f"SELECT {cols} FROM {self.table} WHERE acc_no = $1", [account_no]
        
        return f"SELECT {cols} FROM {self.table} LIMIT 10", []

    def build_llm_sql(self, intent: Dict[str, Any]) -> Tuple[str, List[Any]]:
        """Builds SQL based on LLM extracted intent."""
        cols = ", ".join(intent.get("columns", [])) or "*"
        limit = intent.get("limit", 10)
        params = []
        where_clauses = []
        
        # Add account filter
        if intent.get("acc_no"):
            params.append(intent["acc_no"])
            where_clauses.append(f"acc_no = ${len(params)}")
            
        # Add other filters if valid
        filters = intent.get("filters", {})
        for col, val in filters.items():
            if col in COLUMN_MAPPING.values():
                params.append(val)
                where_clauses.append(f"{col} = ${len(params)}")
        
        where_sql = f" WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        sql = f"SELECT {cols} FROM {self.table}{where_sql} LIMIT {limit}"
        return sql, params

# --- ENGINE ---
class DeterministicEngine:
    """Orchestrates the retrieval process with Smart Routing."""
    
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self.security = SecurityManager()
        self.core = DeterministicCore()
        self.llm = LLMManager()

    async def connect(self):
        if not self.pool:
            try:
                self.pool = await asyncpg.create_pool(DATABASE_URL)
                logger.info("Database pool established.")
            except Exception as e:
                logger.error(f"DB connection failed: {str(e)}")
                raise

    async def disconnect(self):
        if self.pool:
            await self.pool.close()

    async def process_query(self, user_query: str) -> QueryResponse:
        start_time = time.time()
        method = "fast"
        
        try:
            # 1. Smart Routing
            if self.core.is_simple_query(user_query):
                sql, params = self.core.build_fast_sql(user_query)
                logger.info("Using Fast Path routing.")
            else:
                method = "llm"
                intent = await self.llm.extract_intent(user_query)
                if not intent:
                    sql, params = self.core.build_fast_sql(user_query) # Fallback
                else:
                    sql, params = self.core.build_llm_sql(intent)
                logger.info("Using LLM Path routing.")

            # 2. Security Validation
            is_valid, sec_error = self.security.validate_query(sql)
            if not is_valid:
                return QueryResponse(success=False, error=sec_error, sql=sql)

            # 3. DB Execution
            if not self.pool: await self.connect()
            async with self.pool.acquire() as conn:
                async with conn.transaction(readonly=True):
                    rows = await conn.fetch(sql, *params)
                    
            execution_time = (time.time() - start_time) * 1000
            return QueryResponse(
                success=True, data=[dict(r) for r in rows], 
                sql=sql, execution_time_ms=round(execution_time, 2),
                method=method
            )

        except Exception as e:
            logger.error(f"Engine Error: {str(e)}", exc_info=True)
            return QueryResponse(success=False, error=f"Processing Error: {str(e)}")

# Global shared instance
engine = DeterministicEngine()
