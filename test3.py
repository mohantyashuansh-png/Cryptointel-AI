import lancedb
import pyarrow as pa
try:
    db = lancedb.connect("./test_vault")
    schema = pa.schema([pa.field("vector", pa.list_(pa.float32(), 2)), pa.field("text", pa.string())])
    tbl = db.create_table("test_table", schema=schema)
    print("Table created.")
    print("Has to_arrow?", hasattr(tbl, "to_arrow"))
    try:
        print(tbl.to_arrow().to_pylist())
    except Exception as e:
        print("ERROR ON to_arrow:", repr(e))
except Exception as e:
    print("OTHER ERROR:", repr(e))
