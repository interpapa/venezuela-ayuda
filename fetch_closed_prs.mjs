async function run() {
  // We need to find PRs opened by the user "interpapa" that are closed
  const res = await fetch('https://api.github.com/repos/mawmawmaw/venezuela-ayuda/pulls?state=closed');
  const pulls = await res.json();
  const userPulls = pulls.filter(pr => pr.user && pr.user.login === 'interpapa');
  
  for (const pr of userPulls) {
    console.log(`\nPR #${pr.number}: ${pr.title}`);
    console.log(`Status: ${pr.merged_at ? 'Merged' : 'Closed without merging'}`);
    
    // Fetch comments
    const cRes = await fetch(pr.comments_url);
    const comments = await cRes.json();
    if (comments.length === 0) {
      console.log('  No comments.');
    } else {
      comments.forEach(c => {
        console.log(`  Comment by @${c.user.login}: ${c.body}`);
      });
    }
  }
}
run();
