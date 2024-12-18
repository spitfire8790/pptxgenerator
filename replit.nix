{ pkgs }: {
    deps = [
        pkgs.nodejs_18
        pkgs.typescript
        pkgs.nodePackages.typescript-language-server
    ];
}
