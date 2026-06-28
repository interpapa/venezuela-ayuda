async function run() {
  const res = await fetch('https://api.github.com/repos/mawmawmaw/venezuela-ayuda/pulls?state=open');
  const pulls = await res.json();
  console.log(`Open PRs: ${pulls.length}`);
  pulls.forEach(pr => console.log(`PR #${pr.number}: ${pr.title} (by @${pr.user.login})`));
}
run();
