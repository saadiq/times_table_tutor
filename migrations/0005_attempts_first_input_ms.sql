-- Time from problem serve to the first digit tap, isolating recall from keypad
-- navigation (equals response_time_ms on multiple choice). Old clients omit the
-- field; their rows stay NULL.
ALTER TABLE attempts ADD COLUMN first_input_ms INTEGER;
