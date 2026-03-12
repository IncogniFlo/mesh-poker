{
  description = "Planning Poker applet for The Weave / Moss";

  inputs = {
    holonix.url = "github:holochain/holonix?ref=main-0.6";
    nixpkgs.follows = "holonix/nixpkgs";
    # Override rust-overlay so it includes Rust 1.88.0 (which holonix main-0.6 requires)
    rust-overlay.url = "github:oxalica/rust-overlay";
    holonix.inputs.rust-overlay.follows = "rust-overlay";
  };

  outputs = inputs: inputs.holonix.inputs.flake-parts.lib.mkFlake { inherit inputs; } {
    systems = builtins.attrNames inputs.holonix.devShells;
    perSystem = { inputs', pkgs, ... }: {
      devShells.default = pkgs.mkShell {
        inputsFrom = [ inputs'.holonix.devShells.default ];
        packages = [ pkgs.nodejs_20 ];
      };
    };
  };
}
