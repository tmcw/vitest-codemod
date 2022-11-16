// index.ts
import { addImport, paths, RecipeBuilder } from "blitz/installer";
import j from "jscodeshift";
import { join } from "path";

const builder = RecipeBuilder()
  .setName("Vitest migration")
  .setDescription("Modifies existing tests to work with vitest")
  .setOwner("Tom MacWright <tom@macwright.com>")
  .setRepoLink("https://github.com/fake-author/my-recipe");

builder.addAddDependenciesStep({
  stepId: "addDeps",
  stepName: "Add npm dependencies",
  explanation: `Adding vitest and vite`,
  packages: [
    { name: "vitest", version: "0.25.2", isDevDep: true },
    { name: "vite", version: "3.2.4", isDevDep: true },
  ],
});

builder.addTransformFilesStep({
  stepId: "changeText",
  stepName: "Change test command",
  explanation: `Changing test command to run vite`,
  singleFileSearch: paths.packageJson(),
  transformPlain(pkg: string) {
    const json = JSON.parse(pkg);
    json.scripts.test = "vite";
    return JSON.stringify(json);
  },
});

builder.addNewFilesStep({
  stepId: "addConfiguration",
  stepName: "Add server vite configuration",
  explanation: `This configuration file will replace jest.config.ts`,
  targetDirectory: "./",
  templatePath: join(__dirname, "templates"),
  templateValues: {},
});

builder.addTransformFilesStep({
  stepId: "migrateTests",
  stepName: "Migrate tests",
  explanation: `Migrate Jest syntax to Vite`,
  singleFileSearch: "app/**/*.test.ts",
  multi: true,
  transform(program: j.Collection<j.Program>) {
    let needsVi = false;

    program
      .find(j.CallExpression, { callee: { object: { name: "jest" } } })
      .forEach((path) => {
        needsVi = true;
        (path.value.callee as any).object.name = "vi";
        if ((path.value.callee as any).property.name === "requireActual") {
          (path.value.callee as any).property.name = "importActual";
        }
      });

    /**
     * Port Jest Globals
     * https://jestjs.io/docs/api
     */
    const apis = [
      "beforeEach",
      "afterEach",
      "beforeAll",
      "afterAll",
      "test",
      "it",
      "expect",
      "describe",
    ]
      .filter((name) => {
        let calls = program.find(j.CallExpression, { callee: { name } });
        return calls.length > 0;
      })
      .map((name) => {
        return j.importSpecifier(j.identifier(name), j.identifier(name));
      });

    if (needsVi) {
      apis.push(j.importSpecifier(j.identifier("vi"), j.identifier("vi")));
    }

    if (apis.length) {
      program = addImport(
        program,
        j.importDeclaration(apis, j.stringLiteral("vitest"))
      );
    }

    return program;
  },
});

export default builder.build();
