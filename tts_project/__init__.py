import copy
from django.template import context

# Python 3.14 + Django 4.2 Compatibility Patch for Template Context Copy
def _py314_basecontext_copy(self):
    duplicate = object.__new__(self.__class__)
    duplicate.__dict__.update(self.__dict__)
    duplicate.dicts = self.dicts[:]
    if hasattr(self, 'render_context'):
        duplicate.render_context = copy.copy(self.render_context)
    return duplicate

context.BaseContext.__copy__ = _py314_basecontext_copy
