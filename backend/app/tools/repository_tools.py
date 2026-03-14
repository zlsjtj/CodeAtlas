from sqlalchemy.orm import Session

from app.schemas.tool import (
    FindSymbolRequest,
    ListRepoTreeRequest,
    ReadFileRequest,
    SearchRepoRequest,
    ToolExecutionResponse,
)
from app.services.retrieval_service import RepositoryQueryService


class RepositoryTools:
    def __init__(self, db: Session):
        self.query_service = RepositoryQueryService(db)

    def list_repo_tree(self, payload: ListRepoTreeRequest) -> ToolExecutionResponse:
        return self.query_service.list_repo_tree(payload)

    def search_repo(self, payload: SearchRepoRequest) -> ToolExecutionResponse:
        return self.query_service.search_repo(payload)

    def read_file(self, payload: ReadFileRequest) -> ToolExecutionResponse:
        return self.query_service.read_file(payload)

    def find_symbol(self, payload: FindSymbolRequest) -> ToolExecutionResponse:
        return self.query_service.find_symbol(payload)
