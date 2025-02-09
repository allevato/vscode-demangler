# Change Log

All notable changes to the "vscode-demangler" extension will be documented in
this file.

## 0.1.0 (February 9, 2025)

### New Features

-   Added support for Swift USRs (mangled symbols starting with `s:`) and
    macro expansions (starting with `@__swiftmacro_`).

### Bug fixes

-   Many more C++ symbols are now recognized (thanks @bit-fu!).
-   Swift symbols containing `$` are now recognized.

## 0.0.1 (June 19, 2022)

-   Initial release.
