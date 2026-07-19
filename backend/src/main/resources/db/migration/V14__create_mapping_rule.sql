CREATE TABLE mapping_rule(
    id BIGSERIAL PRIMARY KEY,
    record_type VARCHAR NOT NULL,
    position INT NOT NULL,
    json_field VARCHAR NOT NULL,
    mnt_column VARCHAR NOT NULL,
    rule_type VARCHAR NOT NULL,
    rule_value VARCHAR,
    CONSTRAINT uq_mapping_slot UNIQUE(record_type, position)
);
INSERT INTO mapping_rule (record_type, position, json_field, mnt_column, rule_type, rule_value) VALUES
  ('FDETL', 1, 'item_id',          'ITEM',     'DIRECT',    NULL),
  ('FDETL', 2, 'store_id_or_zone', 'LOC_TYPE', 'VALUE_MAP', '{"STORE":"S","ZONE":"Z"}'),
  ('FDETL', 5, 'currency',         'CURRENCY', 'DEFAULT',   'VND');
