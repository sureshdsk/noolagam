const usage = `noolagam backend CLI (WIP — pipeline lands in P1)

Usage:
  npm run cli -- <command> [options]

Commands:
  process <epub>   Run the processing pipeline on an EPUB (P1)
  verify <epub>    Sanity-check EPUB structure (P1)

Options:
  --help, -h       Show this help
`;

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(usage);
  process.exit(0);
}

console.error(`unknown command: ${args.join(" ")}`);
console.error(usage);
process.exit(1);
