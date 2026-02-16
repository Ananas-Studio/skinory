describe("Landing App - Home Page", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("should load the homepage successfully", () => {
    cy.url().should("eq", Cypress.config("baseUrl") + "/");
  });

  it("should have a visible body", () => {
    cy.get("body").should("exist").and("be.visible");
  });

  it("should display page content", () => {
    cy.get("body").should("not.be.empty");
  });
});
