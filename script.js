// SAS WONDER CONSTRUCTION — script.js

document.addEventListener('DOMContentLoaded', function () {

  // ── NAVBAR SCROLL ──
  var navbar = document.getElementById('navbar');
  var progressBar = document.getElementById('progress-bar');
  window.addEventListener('scroll', function () {
    if (window.scrollY > 60) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
    majLienActif();
    majBoutonHaut();
    // Barre de progression de lecture
    if (progressBar) {
      var h = document.documentElement;
      var total = h.scrollHeight - h.clientHeight;
      var pct = total > 0 ? (window.scrollY / total) * 100 : 0;
      progressBar.style.width = pct + '%';
    }
  }, { passive: true });

  // ── SMOOTH SCROLL ──
  document.querySelectorAll('a[href^="#"]').forEach(function (lien) {
    lien.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      var cible = document.querySelector(href);
      if (!cible) return;
      e.preventDefault();
      var top = cible.getBoundingClientRect().top + window.scrollY - navbar.offsetHeight;
      window.scrollTo({ top: top, behavior: 'smooth' });
      fermerMenu();
    });
  });

  // ── LIEN ACTIF ──
  var sections = document.querySelectorAll('section[id]');
  var liens = document.querySelectorAll('.nav-menu a');
  function majLienActif() {
    var courant = '';
    sections.forEach(function (s) {
      if (window.scrollY >= s.offsetTop - navbar.offsetHeight - 80) courant = s.getAttribute('id');
    });
    liens.forEach(function (l) {
      l.classList.remove('actif');
      if (l.getAttribute('href') === '#' + courant) l.classList.add('actif');
    });
  }

  // ── MENU BURGER ──
  var burger = document.getElementById('burger');
  var navMenu = document.getElementById('nav-menu');
  function fermerMenu() {
    if (burger) burger.classList.remove('ouvert');
    if (navMenu) navMenu.classList.remove('ouvert');
  }
  if (burger) {
    burger.addEventListener('click', function () {
      burger.classList.toggle('ouvert');
      navMenu.classList.toggle('ouvert');
    });
  }
  document.addEventListener('click', function (e) {
    if (navbar && !navbar.contains(e.target)) fermerMenu();
  });

// ── CARROUSEL D'IMAGES (hero, services, galerie, équipe) ──
  // Boucle continue dans un seul sens, avec copies invisibles aux
  // deux extrémités du rail pour un glissement fluide.
  // Chargement différé : un carrousel n'initialise ses photos que
  // lorsqu'il approche de l'écran (pas tout au chargement de la page).
  function initCarrousel(car) {
    var liste = (car.dataset.images || '').split(',')
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
    if (!liste.length) return;
    var alt = car.dataset.alt || '';
    var intervalle = parseInt(car.dataset.interval || '5000', 10);

    var titres = (car.dataset.titres || '').split(',').map(function (s) { return s.trim(); });
    var lieux = (car.dataset.lieux || '').split(',').map(function (s) { return s.trim(); });
    var info = car.parentElement ? car.parentElement.querySelector('.galerie-info') : null;
    var infoStrong = info ? info.querySelector('strong') : null;
    var infoSpan = info ? info.querySelector('span') : null;

    var valides = [];
    var restant = liste.length;

    liste.forEach(function (src) {
      var im = new Image();
      im.onload = function () { valides.push(src); fini(); };
      im.onerror = function () { fini(); };
      im.src = src;
    });

    function fini() {
      restant--;
      if (restant > 0) return;
      if (!valides.length) return;

      valides.sort(function (a, b) { return liste.indexOf(a) - liste.indexOf(b); });
      var titresValides = valides.map(function (src) { return titres[liste.indexOf(src)] || ''; });
      var lieuxValides = valides.map(function (src) { return lieux[liste.indexOf(src)] || ''; });

      function majInfo(index) {
        if (!info) return;
        if (infoStrong && titresValides[index]) infoStrong.textContent = titresValides[index];
        if (infoSpan && lieuxValides[index]) infoSpan.textContent = lieuxValides[index];
      }
      function creerImg(src) {
        var img = document.createElement('img');
        img.src = src;
        img.alt = alt;
        return img;
      }

      car.classList.add('a-des-images');
      var track = document.createElement('div');
      track.className = 'carrousel-track';
      var n = valides.length;

      if (n === 1) {
        track.appendChild(creerImg(valides[0]));
        car.appendChild(track);
        majInfo(0);
        return;
      }

      track.appendChild(creerImg(valides[n - 1]));
      valides.forEach(function (src) { track.appendChild(creerImg(src)); });
      track.appendChild(creerImg(valides[0]));
      car.appendChild(track);

      var reel = 0;
      var visuel = 1;

      function placer(sansAnimation) {
        if (sansAnimation) {
          track.style.transition = 'none';
          track.style.transform = 'translateX(-' + (visuel * 100) + '%)';
          void track.offsetWidth;
          track.style.transition = '';
        } else {
          track.style.transform = 'translateX(-' + (visuel * 100) + '%)';
        }
      }
      placer(true);
      majInfo(reel);

      track.addEventListener('transitionend', function (e) {
        if (e.propertyName !== 'transform') return;
        if (visuel === n + 1) { visuel = 1; placer(true); }
        else if (visuel === 0) { visuel = n; placer(true); }
      });

      function avancer() {
        var venaitDeLaFin = (reel === n - 1);
        reel = (reel + 1) % n;
        visuel = venaitDeLaFin ? n + 1 : reel + 1;
        placer(false);
        majInfo(reel);
      }
      function reculer() {
        var venaitDuDebut = (reel === 0);
        reel = (reel - 1 + n) % n;
        visuel = venaitDuDebut ? 0 : reel + 1;
        placer(false);
        majInfo(reel);
      }

      var minuteur = setInterval(avancer, intervalle);
      function relancer() { clearInterval(minuteur); minuteur = setInterval(avancer, intervalle); }

      var precedent = document.createElement('button');
      precedent.className = 'carrousel-fleche carrousel-prev';
      precedent.setAttribute('aria-label', 'Photo précédente');
      precedent.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';

      var suivantBtn = document.createElement('button');
      suivantBtn.className = 'carrousel-fleche carrousel-next';
      suivantBtn.setAttribute('aria-label', 'Photo suivante');
      suivantBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';

      precedent.addEventListener('click', function (e) { e.preventDefault(); reculer(); relancer(); });
      suivantBtn.addEventListener('click', function (e) { e.preventDefault(); avancer(); relancer(); });

      car.appendChild(precedent);
      car.appendChild(suivantBtn);
    }
  }

  var carrouselObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        initCarrousel(entry.target);
        carrouselObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '300px 0px', threshold: 0.01 });

  document.querySelectorAll('.carrousel').forEach(function (car) {
    carrouselObserver.observe(car);
  });
  
  // ── FAQ ACCORDION ──
  document.querySelectorAll('.faq-question').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = this.closest('.faq-item');
      var answer = item.querySelector('.faq-answer');
      var isOuvert = this.classList.contains('ouvert');
      document.querySelectorAll('.faq-question').forEach(function (b) {
        b.classList.remove('ouvert');
        b.closest('.faq-item').querySelector('.faq-answer').classList.remove('ouvert');
      });
      if (!isOuvert) {
        this.classList.add('ouvert');
        answer.classList.add('ouvert');
      }
    });
  });

  // ── COMPTEURS ANIMÉS (section chiffres clés) ──
  // Anime "300+", "100%", "24h", "2024" en partant de 0
  // jusqu'à la valeur réelle quand la section devient visible.
  var chiffres = document.querySelectorAll('.chiffre-n');
  function animerCompteur(el) {
    var texte = el.textContent.trim();
    var match = texte.match(/^(\d+)(.*)$/);
    if (!match) return;
    var cible = parseInt(match[1], 10);
    var suffixe = match[2];
    var duree = 1400;
    var debut = null;
    function step(horodatage) {
      if (!debut) debut = horodatage;
      var progres = Math.min((horodatage - debut) / duree, 1);
      var valeur = Math.floor(progres * cible);
      el.textContent = valeur + suffixe;
      if (progres < 1) requestAnimationFrame(step);
      else el.textContent = cible + suffixe;
    }
    requestAnimationFrame(step);
  }
  if (chiffres.length) {
    var chiffresObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animerCompteur(entry.target);
          chiffresObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    chiffres.forEach(function (el) { chiffresObserver.observe(el); });
  }

  // ── ANIMATIONS SCROLL (fade-in) ──
  document.querySelectorAll(
    '.service-card,.galerie-item,.chiffre-item,.pourquoi-item,.coord-item,.section-header,.pourquoi-text,.pourquoi-img,.zones-tags,.partenaire-card,.faq-item,.valeur-card,.certif-item,.fiche-row'
  ).forEach(function (el) { el.classList.add('anim'); });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.anim').forEach(function (el) { observer.observe(el); });

  // ── BOUTON RETOUR EN HAUT ──
  var topBtn = document.getElementById('top-btn');
  function majBoutonHaut() {
    if (!topBtn) return;
    if (window.scrollY > 400) topBtn.classList.add('visible');
    else topBtn.classList.remove('visible');
  }
  if (topBtn) topBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  // ── FORMULAIRE DEVIS ──
  var form = document.getElementById('form-devis');
  if (!form) return;
  var btnSubmit = document.getElementById('btn-submit');
  var formOk = document.getElementById('form-ok');

  // ── AFFICHAGE DES FICHIERS SÉLECTIONNÉS ──
  var fileInput = document.getElementById('documents');
  var fileInfo  = document.getElementById('file-upload-info');
  var fileList  = document.getElementById('file-list');
  var dt        = new DataTransfer();

  function renderFileList() {
    if (!fileList) return;
    fileList.innerHTML = '';
    Array.from(dt.files).forEach(function (f, i) {
      var li = document.createElement('li');
      li.className = 'file-list-item';
      var name = document.createElement('span');
      name.textContent = f.name;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'file-remove';
      btn.setAttribute('aria-label', 'Supprimer ' + f.name);
      btn.textContent = '✕';
      btn.addEventListener('click', function () {
        dt.items.remove(i);
        fileInput.files = dt.files;
        renderFileList();
        updateFileInfo();
      });
      li.appendChild(name);
      li.appendChild(btn);
      fileList.appendChild(li);
    });
  }

  function updateFileInfo() {
    if (!fileInfo) return;
    var count = dt.files.length;
    if (count === 0) {
      fileInfo.textContent = 'Aucun fichier sélectionné';
    } else {
      fileInfo.textContent = count === 1 ? '1 fichier ajouté' : count + ' fichiers ajoutés';
    }
  }

  if (fileInput) {
    fileInput.addEventListener('change', function () {
      Array.from(this.files).forEach(function (f) {
        var exists = Array.from(dt.files).some(function (e) {
          return e.name === f.name && e.size === f.size;
        });
        if (!exists) dt.items.add(f);
      });
      fileInput.files = dt.files;
      renderFileList();
      updateFileInfo();
    });
  }

  function erreur(id, msg) {
    var el = document.getElementById(id);
    var err = document.getElementById('err-' + id);
    if (el) el.classList.add('invalide');
    if (err) err.textContent = msg;
  }
  function ok(id) {
    var el = document.getElementById(id);
    var err = document.getElementById('err-' + id);
    if (el) el.classList.remove('invalide');
    if (err) err.textContent = '';
  }

  function valider() {
    ['nom','tel','email','type-client','prestation','rgpd'].forEach(ok);
    var valide = true;
    var nom = document.getElementById('nom').value.trim();
    if (nom.length < 2) { erreur('nom','Merci de saisir votre nom.'); valide=false; }
    var tel = document.getElementById('tel').value.replace(/[\s.\-]/g,'');
    if (!/^(\+33|0)[0-9]{9}$/.test(tel)) { erreur('tel','Numéro invalide (ex: 06 12 34 56 78).'); valide=false; }
    var email = document.getElementById('email').value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { erreur('email','Email invalide.'); valide=false; }
    var typeClient = document.getElementById('type-client').value;
    if (!typeClient) { erreur('type-client','Merci de préciser votre profil.'); valide=false; }
    var prest = document.getElementById('prestation').value;
    if (!prest) { erreur('prestation','Choisissez une prestation.'); valide=false; }
    var rgpd = document.getElementById('rgpd').checked;
    if (!rgpd) { erreur('rgpd','Veuillez accepter la politique de confidentialité.'); valide=false; }
    return valide;
  }

  ['nom','tel','email','type-client','prestation'].forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.addEventListener('input',function(){ok(id);});
  });
  var rgpdEl = document.getElementById('rgpd');
  if(rgpdEl) rgpdEl.addEventListener('change',function(){ok('rgpd');});

form.addEventListener('submit', function (e) {
    if (!valider()) { e.preventDefault(); return; }
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Envoi en cours...';
    // Pas de preventDefault ici : le navigateur envoie le formulaire
    // normalement, pour que les fichiers joints soient bien transmis.
    // Le client est redirigé vers merci.html après l'envoi.
  });  function succes() {
    form.reset();
    dt = new DataTransfer();
    renderFileList();
    updateFileInfo();
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Envoyer ma demande →';
    formOk.style.display = 'block';
    setTimeout(function () { formOk.style.display = 'none'; }, 7000);
  }
  function echec() {
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Envoyer ma demande →';
    formOk.style.display = 'block';
    formOk.style.background = 'rgba(226,75,74,0.15)';
    formOk.style.borderColor = 'rgba(226,75,74,0.4)';
    formOk.style.color = '#F09595';
    formOk.textContent = '✗ Erreur. Appelez-nous directement.';
  }

});
