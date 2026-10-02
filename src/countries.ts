// Source of the one declaration file shared by every open-flags/countries/<CC> entry point (see the
// package.json "exports" and tsconfig.build.json). Nothing imports this module at runtime.

/**
 * `open-flags/countries/<CC>`: importing one registers every flag of that country (national flag, coat of
 * arms, subdivisions, extras), so getFlagSvg() serves them synchronously. It exports nothing.
 */
export {};
