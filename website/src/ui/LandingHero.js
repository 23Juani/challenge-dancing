/**
 * Componente de Landing Page: réplica exacta de Hiko (Image 1 & 3).
 * Maneja la transición cinemática hacia el visor satelital 3D.
 */
import { SOLUTION_NAME } from '../config.js';
import { icons } from './icons.js';

export function mountLandingHero(container, { onExplore }) {
  const brandName = SOLUTION_NAME ? SOLUTION_NAME : 'Hiko';

  container.innerHTML = `
    <div class="landing-view" id="landing-screen">
      <!-- Navbar -->
      <header class="landing-nav">
        <div class="landing-nav__brand">${brandName}</div>
        <div class="landing-nav__links">
          <a class="landing-nav__link">Services</a>
          <a class="landing-nav__link">Journey</a>
          <a class="landing-nav__link">Contact</a>
          <div class="landing-nav__socials">
            ${icons.instagram}
            ${icons.xTwitter}
            ${icons.facebook}
          </div>
        </div>
      </header>

      <!-- Hero Section -->
      <main class="landing-hero">
        <div class="landing-hero__trusted">
          <div class="landing-hero__avatars">
            <span class="landing-hero__avatar" style="background-image:url('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80')"></span>
            <span class="landing-hero__avatar" style="background-image:url('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80')"></span>
            <span class="landing-hero__avatar" style="background-image:url('https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80')"></span>
            <span class="landing-hero__avatar" style="background-image:url('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80')"></span>
          </div>
          <div class="landing-hero__trusted-text">
            Trusted by 150+<br />explorers and hikers
          </div>
        </div>

        <h1 class="landing-hero__title">Let's Go Hiking</h1>
        <p class="landing-hero__subtitle">
          Led by locals, built for those who want more than a pretty view,
          real connection, fresh air, and stories to take home.
        </p>

        <div class="landing-hero__actions">
          <button class="landing-btn" id="btn-start-hike">
            Start Your Hike &rarr;
          </button>
          <button class="landing-btn landing-btn--secondary" id="btn-explore-terra">
            Explorar Plataforma Satelital 3D 🛰
          </button>
        </div>
      </main>
    </div>

    <!-- Botón flotante para regresar a Landing -->
    <button class="btn-back-to-landing" id="btn-back-to-landing" style="display: none;">
      &larr; Volver al Inicio
    </button>
  `;

  const screen = container.querySelector('#landing-screen');
  const btnStart = container.querySelector('#btn-start-hike');
  const btnExplore = container.querySelector('#btn-explore-terra');
  const btnBack = container.querySelector('#btn-back-to-landing');

  const enterApp = () => {
    screen.classList.add('is-hidden');
    btnBack.style.display = 'flex';
    if (onExplore) onExplore();
  };

  const returnLanding = () => {
    screen.classList.remove('is-hidden');
    btnBack.style.display = 'none';
  };

  btnStart.addEventListener('click', enterApp);
  btnExplore.addEventListener('click', enterApp);
  btnBack.addEventListener('click', returnLanding);

  return { enterApp, returnLanding };
}
