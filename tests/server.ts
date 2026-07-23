import button from "../packages/components/src/LucidButton/test/LucidButton.fixture.html";

const server = Bun.serve({
  port: Number(process.env.PORT ?? 4174),
  routes: { "/button": button },
});

console.log(`fixtures → http://localhost:${server.port}`);
