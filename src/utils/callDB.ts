import createDbClient from "../db/dbClient";

const callDB = async (query: string) => {
  const client = createDbClient();
  await client.connect();

  try {
    console.log("Executing query:", query);
    const result = await client.query(query);
    return JSON.stringify(result.rows);
  } finally {
    await client.end();
  }
};

export default callDB;