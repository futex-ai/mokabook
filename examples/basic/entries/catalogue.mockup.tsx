import {
  defineCollection,
  defineScreen,
  defineUseCase,
  MockLink,
  ReviewIgnore,
  reviewMaterialKey,
} from "mokabook";

const metadata = {
  dependencies: ["examples/basic/generated/styles.css"],
  navPath: ["Example"],
  relatedDocs: ["examples/basic/notes.md"],
};

function Welcome({ compact }: { compact: boolean }) {
  return (
    <main id="welcome">
      <ReviewIgnore
        id="example-nav"
        materialKey={reviewMaterialKey({ compact })}
      >
        <nav>{compact ? "Menu" : "Example navigation"}</nav>
      </ReviewIgnore>
      <h1>Welcome to Mokabook</h1>
      <MockLink to="example-details">Open the details screen</MockLink>
    </main>
  );
}

function Details({ compact }: { compact: boolean }) {
  return (
    <main id="details">
      <h1>{compact ? "Details" : "Example catalogue details"}</h1>
      <p>This screen is synthetic and belongs only to the package example.</p>
      <MockLink to="example-welcome">Return to welcome</MockLink>
    </main>
  );
}

export const mockups = [
  defineCollection({
    ...metadata,
    childIds: ["example-welcome", "example-details"],
    description: "Synthetic screens used to exercise the reusable framework.",
    id: "example-screens",
    title: "Screens",
  }),
  defineScreen({
    ...metadata,
    address: "example.test/welcome",
    description: "A linked landing screen for the neutral fixture.",
    desktop: <Welcome compact={false} />,
    id: "example-welcome",
    mobile: <Welcome compact />,
    route: "screens/welcome.html",
    title: "Welcome",
    useCaseIds: ["example-tour"],
  }),
  defineScreen({
    ...metadata,
    address: "example.test/details",
    description: "A second synthetic screen proving cross-screen links.",
    desktop: <Details compact={false} />,
    id: "example-details",
    mobile: <Details compact />,
    route: "screens/details.html",
    title: "Details",
    useCaseIds: ["example-tour"],
  }),
  defineUseCase({
    ...metadata,
    description: "An ordered journey that reuses both canonical screens.",
    id: "example-tour",
    route: "user-flows/example-tour.html",
    steps: [{ screenId: "example-welcome" }, { screenId: "example-details" }],
    title: "Example tour",
  }),
];
