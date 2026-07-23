import button from "../packages/components/src/LucidButton/test/LucidButton.fixture.html";
import card from "../packages/components/src/LucidCard/test/LucidCard.fixture.html";
import nav from "../packages/components/src/LucidNav/test/LucidNav.fixture.html";
import tabs from "../packages/components/src/LucidTabs/test/LucidTabs.fixture.html";

const server = Bun.serve({
  port: Number(process.env.PORT ?? 4174),
  routes: {
    "/button": button,
    "/card": card,
    "/nav": nav,
    "/tabs": tabs,
  },
});

console.log(`fixtures → http://localhost:${server.port}`);
