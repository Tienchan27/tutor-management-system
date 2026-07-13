ALTER TABLE refresh_tokens
    ADD COLUMN active_role varchar(30);

UPDATE refresh_tokens rt
SET active_role = COALESCE((
    SELECT r.name
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = rt.user_id
      AND ur.status = 'ACTIVE'
    ORDER BY CASE r.name
        WHEN 'ADMIN' THEN 1
        WHEN 'TUTOR' THEN 2
        WHEN 'STUDENT' THEN 3
        ELSE 4
    END
    LIMIT 1
), 'STUDENT');

ALTER TABLE refresh_tokens
    ALTER COLUMN active_role SET NOT NULL;
