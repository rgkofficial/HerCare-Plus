import pytest

from app.config import settings
from app.db.base import Base
from app.db.session import get_db_session
import app.db.models  # noqa: F401


def test_all_implemented_models_are_registered():
    expected = {
        "branches",
        "products",
        "suppliers",
        "stock_batches",
        "stock_transfers",
        "transfer_items",
        "purchase_orders",
        "purchase_order_items",
        "goods_receipts",
        "goods_receipt_lines",
        "supplier_invoices",
        "supplier_payments",
        "supplier_credit_ledger",
    }

    assert expected.issubset(Base.metadata.tables)


def test_session_dependency_closes_session():
    generator = get_db_session()
    try:
        yielded = next(generator)
        assert yielded is not None
        with pytest.raises(StopIteration):
            next(generator)
    finally:
        generator.close()


def test_headless_setting_is_boolean():
    assert isinstance(settings.headless, bool)
