-- Alert recipients are operational config (not credentials), so they can be
-- changed from the Connections page without restarting the application.
-- Keep the previous AlertService defaults on upgrade to avoid changing where
-- existing installations send notifications.
INSERT INTO config (config_key, config_value) VALUES
    ('alert_email_from', 'sangbom2005@gmail.com'),
    ('alert_email_to', 'sangbom2005@gmail.com')
ON CONFLICT (config_key) DO NOTHING;
