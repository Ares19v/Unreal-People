document.addEventListener("DOMContentLoaded", () => {
    const observerOptions = { root: null, rootMargin: "0px", threshold: 0.2 };
    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (entry.target.classList.contains('khonshu-vid')) {
                    entry.target.classList.add('emerge');
                }
                if (entry.target.classList.contains('add-agent-wrapper')) {
                    entry.target.classList.add('reveal');
                }
                if (entry.target.classList.contains('agents-list')) {
                    const cards = entry.target.querySelectorAll('.agent-card');
                    cards.forEach((card, index) => {
                        setTimeout(() => { card.classList.add('slide-in'); }, index * 100); 
                    });
                    observer.unobserve(entry.target); 
                }
            }
        });
    }, observerOptions);

    const video = document.querySelector('.khonshu-vid');
    if (video) scrollObserver.observe(video);
    const addAgent = document.querySelector('.add-agent-wrapper');
    if (addAgent) scrollObserver.observe(addAgent);
    const agentList = document.querySelector('.agents-list');
    if (agentList) scrollObserver.observe(agentList);
});
