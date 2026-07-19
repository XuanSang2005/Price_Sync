

INSERT INTO config (config_key, config_value) VALUES
    ('ip_allowlist', '127.0.0.1,0:0:0:0:0:0:0:1'),
    ('rate_limit_per_min', '5'),
    ('replay_skew_min', '5'),
    ('xcenter_inbound_path', 'xcenter-inbound'),
    ('filename_pattern', 'pricesync_<batch_id>_v<version>_<ts>.mnt'),
    ('pickup_mode', 'in_place');
