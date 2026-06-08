const { Pool } = require("@neondatabase/serverless");

let pool;

const getPool = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL 환경변수가 설정되지 않았습니다.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }

  return pool;
};

const query = (text, params) => getPool().query(text, params);

const withTransaction = async (callback) => {
  const client = await getPool().connect();

  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getPool,
  query,
  withTransaction
};
