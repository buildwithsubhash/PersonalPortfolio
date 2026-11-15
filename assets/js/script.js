const cfg = window.SITE_CONFIG || {};

/* ===== SCROLL REVEAL (single instance) ===== */
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const srtop = ScrollReveal({
    origin: 'top',
    distance: reduceMotion ? '0px' : '80px',
    duration: reduceMotion ? 0 : 1000,
    reset: !reduceMotion
});

$(document).ready(function () {

    $('#menu').click(function () {
        $(this).toggleClass('fa-times');
        $('.navbar').toggleClass('nav-toggle');
    });

    $(window).on('scroll load', function () {
        $('#menu').removeClass('fa-times');
        $('.navbar').removeClass('nav-toggle');

        if (window.scrollY > 60) {
            document.querySelector('#scroll-top').classList.add('active');
        } else {
            document.querySelector('#scroll-top').classList.remove('active');
        }

        // scroll spy
        $('section[id]').each(function () {
            let height = $(this).height();
            let offset = $(this).offset().top - 200;
            let top = $(window).scrollTop();
            let id = $(this).attr('id');

            if (top > offset && top < offset + height) {
                $('.navbar ul li a').removeClass('active');
                $('.navbar').find(`[href="#${id}"]`).addClass('active');
            }
        });
    });

    // smooth scrolling (in-page anchors only)
    $('a[href^="#"]').on('click', function (e) {
        const href = this.getAttribute('href');
        if (href.length < 2) return;
        const target = $(href);
        if (!target.length) return;
        e.preventDefault();
        $('html, body').animate({ scrollTop: target.offset().top }, reduceMotion ? 0 : 500, 'linear');
    });

    // contact form: EmailJS if configured, otherwise fall back to the visitor's mail app
    $("#contact-form").submit(function (event) {
        event.preventDefault();
        const ej = cfg.emailjs || {};

        if (ej.publicKey && ej.serviceId && ej.templateId && window.emailjs) {
            emailjs.init(ej.publicKey);
            emailjs.sendForm(ej.serviceId, ej.templateId, '#contact-form')
                .then(function () {
                    document.getElementById("contact-form").reset();
                    alert("Message sent. Thank you!");
                }, function (error) {
                    console.error('EmailJS failed:', error);
                    alert("Could not send the message. Please try again or email me directly.");
                });
            return;
        }

        const f = this.elements;
        const body = `Name: ${f.name.value}\nEmail: ${f.email.value}\nPhone: ${f.phone.value}\n\n${f.message.value}`;
        window.location.href = `mailto:${cfg.email}?subject=${encodeURIComponent('Portfolio enquiry from ' + f.name.value)}&body=${encodeURIComponent(body)}`;
    });
});

document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === "visible") {
        document.title = "Portfolio | Subhash Thakur";
        $("#favicon").attr("href", "assets/images/favicon.png");
    } else {
        document.title = "Come Back To Portfolio";
        $("#favicon").attr("href", "assets/images/favhand.png");
    }
});

// typed js effect
new Typed(".typing-text", {
    strings: ["frontend development", "backend development", "web designing", "android development", "web development"],
    loop: true,
    typeSpeed: 50,
    backSpeed: 25,
    backDelay: 500,
});

function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    return response.json();
}

function showSkills(skills) {
    document.getElementById("skillsContainer").innerHTML = skills.map(skill => `
        <div class="bar">
          <div class="info">
            <img src="${esc(skill.icon)}" alt="${esc(skill.name)} logo" loading="lazy" />
            <span>${esc(skill.name)}</span>
          </div>
        </div>`).join("");
}

const CATEGORY_LABELS = { mern: "MERN Stack", lamp: "LAMP Stack", python: "Python", basicweb: "Basic Web", android: "Android App" };
const CATEGORY_ICONS = { mern: "fab fa-react", lamp: "fab fa-php", python: "fab fa-python", basicweb: "fas fa-globe", android: "fab fa-android" };

// Uses the screenshot if the project has one, otherwise a simple placeholder tile.
function thumbnail(project, dir) {
    if (project.image) {
        return `<img draggable="false" src="${dir}${esc(project.image)}" alt="${esc(project.name)} screenshot" loading="lazy" />`;
    }
    const icon = CATEGORY_ICONS[project.category] || "fas fa-code";
    const label = CATEGORY_LABELS[project.category] || "Project";
    return `<div class="thumb-placeholder" role="img" aria-label="${esc(project.name)}"><i class="${icon}" aria-hidden="true"></i><span>${esc(label)}</span></div>`;
}

function linkButton(url, html) {
    return url && url !== "#" ? `<a href="${esc(url)}" class="btn" target="_blank" rel="noopener">${html}</a>` : "";
}

function showProjects(projects) {
    const container = document.querySelector("#work .box-container");
    const viewAll = document.querySelector("#work .viewall");

    // filter first, then limit (previously sliced first, which hid cards)
    const featured = projects.filter(p => p.category !== "android").slice(0, 6);

    if (featured.length === 0) {
        container.innerHTML = `<p class="empty-note">Projects are on the way. In the meantime, see my work on <a href="https://github.com/buildwithsubhash" target="_blank" rel="noopener">GitHub</a>.</p>`;
        if (viewAll) viewAll.style.display = "none";
        return;
    }

    container.innerHTML = featured.map(project => `
        <div class="box tilt">
          ${thumbnail(project, "./assets/images/projects/")}
          <div class="content">
            <div class="tag"><h3>${esc(project.name)}</h3></div>
            <div class="desc">
              <p>${esc(project.desc)}</p>
              <div class="btns">
                ${linkButton(project.links && project.links.view, '<i class="fas fa-eye"></i> View')}
                ${linkButton(project.links && project.links.code, 'Code <i class="fas fa-code"></i>')}
              </div>
            </div>
          </div>
        </div>`).join("");

    VanillaTilt.init(document.querySelectorAll(".tilt"), { max: 15 });
    srtop.reveal('.work .box', { interval: 200 });
}

fetchJSON("./skills.json").then(showSkills).catch(err => console.error("Could not load skills.json:", err));
fetchJSON("./projects/projects.json")
    .catch(err => { console.error("Could not load projects.json:", err); return []; })
    .then(showProjects);

VanillaTilt.init(document.querySelectorAll(".tilt"), { max: 15 });

/* ===== SCROLL REVEAL ===== */
srtop.reveal('.home .content h2', { delay: 200 });
srtop.reveal('.home .content p', { delay: 200 });
srtop.reveal('.home .content .btn', { delay: 200 });
srtop.reveal('.home .image', { delay: 400 });
srtop.reveal('.home .linkedin', { interval: 600 });
srtop.reveal('.home .github', { interval: 800 });
srtop.reveal('.home .telegram', { interval: 600 });
srtop.reveal('.home .instagram', { interval: 600 });

srtop.reveal('.about .content h3', { delay: 200 });
srtop.reveal('.about .content .tag', { delay: 200 });
srtop.reveal('.about .content p', { delay: 200 });
srtop.reveal('.about .content .box-container', { delay: 200 });
srtop.reveal('.about .content .resumebtn', { delay: 200 });

srtop.reveal('.skills .container', { interval: 200 });
srtop.reveal('.skills .container .bar', { delay: 400 });
srtop.reveal('.education .box', { interval: 200 });
srtop.reveal('.experience .timeline', { delay: 400 });
srtop.reveal('.experience .timeline .container', { interval: 400 });
srtop.reveal('.contact .container', { delay: 400 });
srtop.reveal('.contact .container .form-group', { delay: 400 });
