from rest_framework.pagination import PageNumberPagination

TAMANO_PAGINA = 20
TAMANO_PAGINA_MAXIMO = 100


class PaginacionEstandar(PageNumberPagination):
    page_size = TAMANO_PAGINA
    page_size_query_param = "tamano"
    max_page_size = TAMANO_PAGINA_MAXIMO
