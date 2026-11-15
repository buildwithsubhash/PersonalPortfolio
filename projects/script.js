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
    });
});

document.addEventListener('visibilitychange',
    function () {
        if (document.visibilityState === "visible") {
            document.title = "Projects | Portfolio Subhash Thakur";
            $("#favicon").attr("href", "../assets/images/favicon.png");
        }
        else {
            document.title = "Come Back To Portfolio";
            $("#favicon").attr("href", "../assets/images/favhand.png");
        }
    });


// fetch projects
function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
    const container = document.querySelector(".work .box-container");

    if (projects.length === 0) {
        document.getElementById("filters").style.display = "none";
        container.innerHTML = `<p class="empty-note">Projects are on the way. In the meantime, see my work on <a href="https://github.com/buildwithsubhash" target="_blank" rel="noopener">GitHub</a>.</p>`;
        return;
    }

    container.innerHTML = projects.map(project => `
        <div class="grid-item ${esc(project.category)}">
          <div class="box" style="width: 380px; margin: 1rem">
            ${thumbnail(project, "../assets/images/projects/")}
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
          </div>
        </div>`).join("");

    // filter buttons: only categories that actually have projects ("other" appears under All only)
    const present = Object.keys(CATEGORY_LABELS).filter(k => projects.some(p => p.category === k));
    const group = document.getElementById("filters");
    if (present.length < 2) {
        group.style.display = "none";
    } else {
        group.innerHTML = '<button class="btn is-checked" data-filter="*">All Projects</button>' +
            present.map(k => `<button class="btn" data-filter=".${k}">${CATEGORY_LABELS[k]}</button>`).join("");
    }

    // isotope filter (cards still show if the library fails to load)
    if (!$.fn.isotope) return;
    var $grid = $('.box-container').isotope({ itemSelector: '.grid-item', layoutMode: 'fitRows' });

    $('.button-group').on('click', 'button', function () {
        $('.button-group').find('.is-checked').removeClass('is-checked');
        $(this).addClass('is-checked');
        $grid.isotope({ filter: $(this).attr('data-filter') });
    });
}

fetch("projects.json")
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .catch(err => { console.error("Could not load projects.json:", err); return []; })
    .then(showProjects);
