CREATE TABLE lando_test (
    id SERIAL PRIMARY KEY,
    column1 VARCHAR(255) DEFAULT NULL,
    column2 VARCHAR(255) DEFAULT NULL
);
INSERT INTO lando_test VALUES (1, 'lando_original', 'lando_original');
