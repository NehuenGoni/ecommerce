import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../../test/mongoMemory.js";
import { Category } from "../Category.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

describe("Category model", () => {
  it("genera el slug automáticamente a partir del nombre", async () => {
    const category = await Category.create({ name: "Fertilizantes Orgánicos" });
    expect(category.slug).toBe("fertilizantes-organicos");
  });

  it("respeta un slug provisto manualmente", async () => {
    const category = await Category.create({ name: "Sustratos", slug: "sustratos-premium" });
    expect(category.slug).toBe("sustratos-premium");
  });

  it("rechaza slugs duplicados", async () => {
    await Category.create({ name: "Iluminación" });
    await expect(Category.create({ name: "Iluminación" })).rejects.toThrow();
  });

  it("permite subcategorías con referencia a una categoría padre", async () => {
    const parent = await Category.create({ name: "Fertilizantes" });
    const child = await Category.create({ name: "Fertilizantes Líquidos", parent: parent._id });

    expect(child.parent?.toString()).toBe(parent._id.toString());
  });

  it("por defecto no tiene padre", async () => {
    const category = await Category.create({ name: "Macetas" });
    expect(category.parent).toBeNull();
  });
});
