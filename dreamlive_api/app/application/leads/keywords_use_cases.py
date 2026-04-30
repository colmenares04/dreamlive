from typing import List, Optional
from app.core.ports.unit_of_work import IUnitOfWork

class ListKeywordsUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, license_id: str) -> List[str]:
        async with self._uow:
            license = await self._uow.licenses.get_by_id(license_id)
            if not license:
                return []
            # Dividir el string por '/' y limpiar espacios
            return [k.strip() for k in license.keywords.split('/') if k.strip()]

class AddKeywordUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, license_id: str, term: str) -> str:
        clean_term = term.strip().lower().replace('/', '') # Evitar que metan el separador
        async with self._uow:
            license = await self._uow.licenses.get_by_id(license_id)
            if not license:
                return ""
            
            keywords_list = [k.strip().lower() for k in license.keywords.split('/') if k.strip()]
            
            if clean_term not in keywords_list:
                keywords_list.append(clean_term)
                license.keywords = "/".join(keywords_list)
                await self._uow.licenses.update(license)
                await self._uow.commit()
            
            return clean_term

class RemoveKeywordUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, license_id: str, term: str) -> bool:
        target_term = term.strip().lower()
        async with self._uow:
            license = await self._uow.licenses.get_by_id(license_id)
            if not license:
                return False
            
            keywords_list = [k.strip().lower() for k in license.keywords.split('/') if k.strip()]
            
            if target_term in keywords_list:
                keywords_list.remove(target_term)
                license.keywords = "/".join(keywords_list)
                await self._uow.licenses.update(license)
                await self._uow.commit()
                return True
                
            return False
