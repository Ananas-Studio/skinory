describe("Web App - Home Page", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("should load the homepage successfully", () => {
    cy.url().should("eq", Cypress.config("baseUrl") + "/");
  });

  it("should have a visible root element", () => {
    cy.get("#root").should("exist").and("be.visible");
  });

  it("should display page content", () => {
    cy.get("#root").should("not.be.empty");
  });
});
