async function run() {
  const res = await fetch('https://api.github.com/repos/mawmawmaw/venezuela-ayuda/pulls?state=all');
  const pulls = await res.json();
  pulls.forEach(pr => {
    if (pr.title.includes('61') || (pr.body && pr.body.includes('61')) || pr.title.toLowerCase().includes('triage')) {
      console.log(`PR #${pr.number}: ${pr.title} (State: ${pr.state})`);
    }
  });
}
run();
