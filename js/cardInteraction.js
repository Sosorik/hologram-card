/**
 * CardInteraction - 통합 카드 틸트/플립 모듈
 * 
 * 모든 카드(템플릿 뷰, 갤러리 디테일)에서 공용 사용
 * 터치 우선 (Mobile-First) 설계
 * 
 * @version 1.0.0
 */

window.CardInteraction = (function () {
    'use strict';

    // 상수
    const DRAG_THRESHOLD = 5; // 5px 이상 이동 시 드래그로 판정
    const TILT_MAX_DEG = 15;  // 최대 틸트 각도
    const FLIP_DURATION = 1200; // 플립 애니메이션 시간 (ms)

    /**
     * 카드에 상호작용 초기화
     * @param {HTMLElement} wrapper - 카드를 감싸는 wrapper 또는 scene 요소
     * @param {Object} options - 설정
     */
    function init(wrapper, options = {}) {
        const defaults = {
            allowFlip: true,           // 플립 허용 여부
            flipBackDisabled: false,   // 뒷면→앞면 플립 금지
            cardSelector: '.card',     // 카드 요소 선택자
            onTilt: null,              // 틸트 콜백 (x, y, card)
            onFlip: null,              // 플립 콜백 (isFlipped)
            onReset: null              // 리셋 콜백
        };

        const config = { ...defaults, ...options };
        const card = wrapper.querySelector(config.cardSelector);

        if (!card) {
            console.error('[CardInteraction] Card not found in wrapper');
            return;
        }

        // 요소 캐싱
        const elements = {
            shine: card.querySelector('.card__shine'),
            shine2: card.querySelector('.card__shine-layer2'),
            glare: card.querySelector('.card__glare'),
            coating: card.querySelector('.card__coating'),
            backShine: card.querySelector('.card__back-shine'),
            backGlare: card.querySelector('.card__back-glare')
        };

        // 상태 (인스턴스별 격리)
        const state = {
            isFlipped: false,
            isFlipping: false,
            isDragging: false,
            startX: 0,
            startY: 0
        };

        // 상태를 wrapper에 노출 (외부 접근용)
        wrapper._cardState = state;

        // --- 이벤트 핸들러 ---

        // 터치 시작
        function onTouchStart(e) {
            // 이미지 편집 모드일 때 카드 상호작용 비활성화
            if (window.isImageEditMode) return;
            if (e.touches.length > 1) return;
            state.startX = e.touches[0].clientX;
            state.startY = e.touches[0].clientY;
            state.isDragging = false;
        }

        // 터치 이동 (틸트)
        function onTouchMove(e) {
            // 이미지 편집 모드일 때 카드 상호작용 비활성화
            if (window.isImageEditMode) return;
            if (state.isFlipping) return;

            const touch = e.touches[0];
            const dx = Math.abs(touch.clientX - state.startX);
            const dy = Math.abs(touch.clientY - state.startY);

            // 드래그 판정
            if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
                state.isDragging = true;
            }

            // 스크롤 방지 (드래그 중일 때만)
            if (state.isDragging && e.cancelable) {
                e.preventDefault();
            }

            // 틸트 적용
            applyTilt(touch.clientX, touch.clientY, wrapper, card, elements, state, config);
        }

        // 터치 종료
        function onTouchEnd() {
            resetTilt(wrapper, card, elements, state, config);
            // 클릭 이벤트가 isDragging을 볼 수 있도록 약간 지연
            setTimeout(() => { state.isDragging = false; }, 100);
        }

        // 마우스 이동 (틸트) - 데스크톱 폴백
        function onMouseMove(e) {
            // 이미지 편집 모드일 때 카드 상호작용 비활성화
            if (window.isImageEditMode) return;
            if (state.isFlipping) return;
            applyTilt(e.clientX, e.clientY, wrapper, card, elements, state, config);
        }

        // 마우스 떠남
        function onMouseLeave() {
            resetTilt(wrapper, card, elements, state, config);
        }

        // 클릭 (플립)
        function onClick(e) {
            // 드래그 중이었으면 플립 무시
            if (state.isDragging) {
                // [DEBUG REMOVED]
                return;
            }

            // 이미지 편집 모드일 때 플립 비활성화
            if (window.isImageEditMode) return;

            if (!config.allowFlip) return;
            if (state.isFlipping) return;

            // 뒷면→앞면 플립 금지 옵션
            if (config.flipBackDisabled && state.isFlipped) {
                // [DEBUG REMOVED]
                return;
            }

            // 플립 실행
            state.isFlipping = true;
            state.isFlipped = !state.isFlipped;

            card.style.transition = `transform ${FLIP_DURATION}ms cubic-bezier(0.175, 0.885, 0.32, 1.275)`;
            const rotationY = state.isFlipped ? 180 : 0;
            card.style.transform = `rotateY(${rotationY}deg)`;

            if (config.onFlip) config.onFlip(state.isFlipped);

            // 진동 피드백
            if (navigator.vibrate) navigator.vibrate(10);

            setTimeout(() => {
                state.isFlipping = false;
            }, FLIP_DURATION);
        }

        // --- 이벤트 등록 ---

        // 터치 이벤트 (모바일)
        wrapper.addEventListener('touchstart', onTouchStart, { passive: true });
        wrapper.addEventListener('touchmove', onTouchMove, { passive: false });
        wrapper.addEventListener('touchend', onTouchEnd);

        // 마우스 이벤트 (데스크톱)
        wrapper.addEventListener('mousemove', onMouseMove);
        wrapper.addEventListener('mouseleave', onMouseLeave);

        // 클릭 (플립)
        wrapper.addEventListener('click', onClick);

        // [DEBUG REMOVED]

        // 정리 함수 반환 (필요시 이벤트 제거용)
        return function cleanup() {
            wrapper.removeEventListener('touchstart', onTouchStart);
            wrapper.removeEventListener('touchmove', onTouchMove);
            wrapper.removeEventListener('touchend', onTouchEnd);
            wrapper.removeEventListener('mousemove', onMouseMove);
            wrapper.removeEventListener('mouseleave', onMouseLeave);
            wrapper.removeEventListener('click', onClick);
        };
    }

    /**
     * 틸트 적용
     */
    function applyTilt(clientX, clientY, wrapper, card, elements, state, config) {
        const rect = wrapper.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // 틸트 각도 계산
        const rotateX = ((y - centerY) / centerY) * -TILT_MAX_DEG;
        let rotateY = ((x - centerX) / centerX) * TILT_MAX_DEG;

        // 플립 상태 반영 (뒷면이어도 같은 방향으로 틸트)
        let finalY = rotateY + (state.isFlipped ? 180 : 0);
        // 뒷면일 때 상하(X축)는 반전해야 마우스 방향으로 기울어짐
        let finalX = state.isFlipped ? -rotateX : rotateX;

        // 즉각 반응 (트랜지션 제거)
        card.style.transition = 'none';
        card.style.transform = `rotateY(${finalY}deg) rotateX(${finalX}deg)`;

        // 홀로그램 효과 위치 계산
        const percentX = (x / rect.width) * 100;
        const percentY = (y / rect.height) * 100;

        // Shine 업데이트
        if (elements.shine) {
            elements.shine.style.backgroundPosition = `${percentX}% ${percentY}%`;
        }
        if (elements.shine2) {
            // Layer 2는 역방향 패럴랙스
            const parallaxRange = 25;
            const normX = (x / rect.width - 0.5) * 2;
            const normY = (y / rect.height - 0.5) * 2;
            const pX = 50 + (normX * -parallaxRange);
            const pY = 50 + (normY * -parallaxRange);
            elements.shine2.style.backgroundPosition = `${pX}% ${pY}%`;
        }
        if (elements.backShine) {
            elements.backShine.style.backgroundPosition = `${percentX}% ${percentY}%`;
        }

        // Glare 업데이트
        if (elements.glare) {
            const offsetX = (x - centerX) * 0.5;
            const offsetY = (y - centerY) * 0.5;
            elements.glare.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
            elements.glare.style.opacity = '0.8';
        }
        if (elements.backGlare) {
            const offsetX = (x - centerX) * 0.5;
            const offsetY = (y - centerY) * 0.5;
            elements.backGlare.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
            elements.backGlare.style.opacity = '0.8';
        }

        // Coating 업데이트
        if (elements.coating) {
            elements.coating.style.backgroundPosition = `${percentX}% ${percentY}%`;
        }

        // 콜백
        if (config.onTilt) {
            config.onTilt(x / rect.width - 0.5, y / rect.height - 0.5, card);
        }
    }

    /**
     * 틸트 리셋
     */
    function resetTilt(wrapper, card, elements, state, config) {
        if (state.isFlipping) return;

        card.style.transition = 'transform 0.5s ease-out';
        const baseRotation = state.isFlipped ? 180 : 0;
        card.style.transform = `rotateY(${baseRotation}deg) rotateX(0deg)`;

        // Glare 숨김
        if (elements.glare) elements.glare.style.opacity = '0';
        if (elements.backGlare) elements.backGlare.style.opacity = '0';

        // 콜백
        if (config.onReset) config.onReset();
    }

    // Public API
    return {
        init: init
    };
})();

// [DEBUG REMOVED]
