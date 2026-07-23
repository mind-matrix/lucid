import button from "../packages/components/src/LucidButton/test/LucidButton.fixture.html";
import card from "../packages/components/src/LucidCard/test/LucidCard.fixture.html";

const server = Bun.serve({
  port: Number(process.env.PORT ?? 4174),
  routes: {
    "/button": button,
    "/card": card,
  },
});

console.log(`fixtures → http://localhost:${server.port}`);
