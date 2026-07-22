import button from "../packages/components/src/button/test/button.fixture.html";

const server = Bun.serve({
  port: Number(process.env.PORT ?? 4174),
  routes: { "/button": button },
});

console.log(`fixtures → http://localhost:${server.port}`);
