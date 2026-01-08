const members = [
    {
        name: 'Igor Kirnosov',
        role: 'Creator',
        avatar: 'https://o2xjkxudhl.ufs.sh/f/k57kIptYxTsAcA3j1RCZGkaxrlitnX6MyQ0OJ3CjLzVWbYe4',
        link: 'https://x.com/twendykirn',
    },
    {
        name: 'Polly',
        role: 'Mood Manager',
        avatar: 'https://o2xjkxudhl.ufs.sh/f/k57kIptYxTsAlsSHHnQpdRW0hU3wayogvq1H7BS86tPYZzLK',
        link: 'https://x.com/twendykirn',
    },
]

export default function TeamSection() {
    return (
        <section className="bg-background py-16 md:py-32">
            <div className="mx-auto max-w-5xl border-t px-6">
                <span className="text-caption -ml-6 -mt-3.5 block w-max bg-background px-6">Team</span>
                <div className="mt-12 gap-4 sm:grid sm:grid-cols-2 md:mt-24">
                    <div className="sm:w-2/5">
                        <h2 className="text-3xl font-bold sm:text-4xl">Our dream team</h2>
                    </div>
                    <div className="mt-6 sm:mt-0">
                        <p>Meet the team driving the vision. We’re a small operation with big ideas for the future of localization. I handle the development and community support, while my Mood Manager ensures high morale (and the occasional demand for belly rubs). We’re excited to help you go global.</p>
                    </div>
                </div>
                <div className="mt-12 md:mt-24">
                    <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                        {members.map((member, index) => (
                            <div
                                key={index}
                                className="group overflow-hidden">
                                <img
                                    className="h-96 w-full rounded-md object-cover object-top grayscale transition-all duration-500 hover:grayscale-0 group-hover:h-[22.5rem] group-hover:rounded-xl"
                                    src={member.avatar}
                                    alt="team member"
                                    width="826"
                                    height="1239"
                                />
                                <div className="px-2 pt-2 sm:pb-0 sm:pt-4">
                                    <div className="flex justify-between">
                                        <h3 className="text-base font-medium transition-all duration-500 group-hover:tracking-wider">{member.name}</h3>
                                        <span className="text-xs">_0{index + 1}</span>
                                    </div>
                                    <div className="mt-1 flex items-center justify-between">
                                        <span className="text-muted-foreground inline-block translate-y-6 text-sm opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">{member.role}</span>
                                        <a
                                            href={member.link}
                                            target="_blank"
                                            className="group-hover:text-primary-600 dark:group-hover:text-primary-400 inline-block translate-y-8 text-sm tracking-wide opacity-0 transition-all duration-500 hover:underline group-hover:translate-y-0 group-hover:opacity-100">
                                            {' '}
                                            Social
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
