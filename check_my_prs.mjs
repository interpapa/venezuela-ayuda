async function run() {
  const res = await fetch('https://api.github.com/repos/mawmawmaw/venezuela-ayuda/pulls?state=all&sort=updated&direction=desc');
  const pulls = await res.json();
  const recent = pulls.slice(0, 10);
  for (const pr of recent) {
    console.log(`\n\n--- PR #${pr.number} [${pr.state}]: ${pr.title} ---`);
    console.log(`User: ${pr.user.login}`);
    // Fetch comments
    const commentsRes = await fetch(pr.comments_url);
    const comments = await commentsRes.json();
    comments.forEach(c => {
      console.log(`COMMENT [${c.user.login}]: ${c.body.substring(0, 200)}...`);
    });
    
    // Fetch review comments
    const reviewsRes = await fetch(pr.url + '/reviews');
    const reviews = await reviewsRes.json();
    if(Array.isArray(reviews)) {
      reviews.forEach(r => {
        console.log(`REVIEW [${r.user?.login}]: ${r.body.substring(0, 200)}...`);
      });
    }
  }
}
run();
