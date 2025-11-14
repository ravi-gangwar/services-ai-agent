const dbSchema = `
Table: vendor_vendormodel
Key columns: store_name, latitude, longitude, city, vendor_rating, online (boolean)

IMPORTANT: Use actual numeric values in SQL queries, NOT placeholders. Always include LIMIT 10.
For nearby restaurants, calculate a range around coordinates (e.g., ±0.1 degrees ≈ 11km).
Example: SELECT store_name, city, vendor_rating, latitude, longitude, online FROM vendor_vendormodel WHERE latitude BETWEEN 26.4 AND 26.6 AND longitude BETWEEN 80.2 AND 80.4 AND online = true LIMIT 10
`
export default dbSchema; // Export the schema descriptor so other modules can reference it