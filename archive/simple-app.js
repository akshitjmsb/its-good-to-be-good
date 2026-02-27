// Simple JavaScript version of the app for development without build process
console.log('It's Good To Be King - Simple App Loading...');

// Basic app functionality
document.addEventListener('DOMContentLoaded', () => {
    console.log('App initialized');
    
    // Update time display
    function updateTime() {
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: '2-digit' 
        };
        const el = document.getElementById('current-datetime');
        if (el) {
            el.textContent = new Date().toLocaleString('en-CA', options);
        }
    }
    
    // Update time every second
    updateTime();
    setInterval(updateTime, 1000);
    
    // Simple modal functionality
    function setupModals() {
        // Close modals when clicking close button or backdrop
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close-btn') || 
                e.target.classList.contains('fixed')) {
                const modal = e.target.closest('.fixed');
                if (modal) {
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                }
            }
        });
        
        // Exercise modal
        document.getElementById('exercise-clickable-day')?.addEventListener('click', () => {
            showExerciseModal();
        });
    }
    
    function showExerciseModal() {
        const modal = document.getElementById('exercise-modal');
        if (!modal) return;
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        const contentEl = document.getElementById('exercise-content');
        if (!contentEl) return;
        
        // Show loading
        contentEl.innerHTML = '<p>Loading exercise plan...</p>';
        
        // Simulate loading and show sample content
        setTimeout(() => {
            const today = new Date();
            const dayOfWeek = today.getDay();
            const workoutType = getWorkoutType(dayOfWeek);
            const weekDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
            
            contentEl.innerHTML = `
                <div class="exercise-container">
                    <div class="exercise-header">
                        <h3 class="text-lg font-bold mb-2">${weekDay} - ${workoutType} Day</h3>
                        <div class="workout-type-badge ${workoutType.toLowerCase()}-badge">
                            ${workoutType}
                        </div>
                    </div>
                    
                    <div class="exercise-content">
                        ${renderWorkoutSection(workoutType)}
                        ${renderWeeklySchedule()}
                    </div>
                </div>
            `;
        }, 1000);
    }
    
    function getWorkoutType(dayOfWeek) {
        const schedule = ['Legs', 'Push', 'Pull', 'Legs', 'Rest', 'Push', 'Pull'];
        return schedule[dayOfWeek];
    }
    
    function renderWorkoutSection(workoutType) {
        const exercises = getSampleExercises(workoutType);
        
        return `
            <div class="workout-section">
                <h4 class="font-semibold mb-3 text-gray-800">Today's Exercises</h4>
                <div class="exercise-list">
                    ${exercises.map((exercise, index) => renderExercise(exercise, index + 1)).join('')}
                </div>
            </div>
        `;
    }
    
    function getSampleExercises(workoutType) {
        const exerciseData = {
            'Push': [
                {
                    name: "Bench Press",
                    muscleGroup: "Chest, Shoulders, Triceps",
                    sets: "4",
                    reps: "8-10",
                    rest: "90s",
                    instructions: "Lie on bench, grip bar slightly wider than shoulders, lower to chest, press up explosively",
                    tips: "Keep core tight, maintain neutral spine"
                },
                {
                    name: "Overhead Press",
                    muscleGroup: "Shoulders, Triceps",
                    sets: "3",
                    reps: "8-12",
                    rest: "60s",
                    instructions: "Stand with feet hip-width, press weight overhead, lower to shoulders",
                    tips: "Engage core, avoid arching back"
                }
            ],
            'Pull': [
                {
                    name: "Pull-ups",
                    muscleGroup: "Lats, Biceps, Rear Delts",
                    sets: "4",
                    reps: "5-10",
                    rest: "90s",
                    instructions: "Hang from bar, pull body up until chin over bar, lower with control",
                    tips: "Use full range of motion, engage lats"
                },
                {
                    name: "Bent-over Rows",
                    muscleGroup: "Lats, Rhomboids, Biceps",
                    sets: "3",
                    reps: "8-12",
                    rest: "60s",
                    instructions: "Hinge at hips, row weight to lower chest, squeeze shoulder blades",
                    tips: "Keep back straight, core engaged"
                }
            ],
            'Legs': [
                {
                    name: "Squats",
                    muscleGroup: "Quads, Glutes, Hamstrings",
                    sets: "4",
                    reps: "8-12",
                    rest: "90s",
                    instructions: "Stand with feet shoulder-width, lower until thighs parallel, drive up through heels",
                    tips: "Keep chest up, knees tracking over toes"
                },
                {
                    name: "Romanian Deadlifts",
                    muscleGroup: "Hamstrings, Glutes",
                    sets: "3",
                    reps: "8-10",
                    rest: "90s",
                    instructions: "Hinge at hips, lower weight along legs, feel stretch in hamstrings",
                    tips: "Keep back straight, slight knee bend"
                }
            ],
            'Rest': [
                {
                    name: "Light Stretching",
                    muscleGroup: "Full Body",
                    sets: "1",
                    reps: "10-15 min",
                    rest: "N/A",
                    instructions: "Gentle stretching and mobility work for active recovery",
                    tips: "Focus on breathing and relaxation"
                }
            ]
        };
        
        return exerciseData[workoutType] || exerciseData['Rest'];
    }
    
    function renderExercise(exercise, number) {
        return `
            <div class="exercise-item mb-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div class="exercise-header flex justify-between items-start mb-2">
                    <h5 class="font-medium text-gray-800">${number}. ${exercise.name}</h5>
                    <span class="text-sm text-gray-500">${exercise.muscleGroup}</span>
                </div>
                
                <div class="exercise-details grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div class="detail-item">
                        <span class="font-medium text-gray-600">Sets:</span>
                        <span class="ml-1">${exercise.sets}</span>
                    </div>
                    <div class="detail-item">
                        <span class="font-medium text-gray-600">Reps:</span>
                        <span class="ml-1">${exercise.reps}</span>
                    </div>
                    <div class="detail-item">
                        <span class="font-medium text-gray-600">Rest:</span>
                        <span class="ml-1">${exercise.rest}</span>
                    </div>
                </div>
                
                <div class="exercise-instructions mt-2 text-sm text-gray-600">
                    <span class="font-medium">Instructions:</span>
                    <p class="mt-1">${exercise.instructions}</p>
                </div>
                
                <div class="exercise-tips mt-2 p-2 bg-yellow-50 rounded text-sm">
                    <span class="font-medium text-yellow-800">💡 Tip:</span>
                    <span class="text-yellow-700 ml-1">${exercise.tips}</span>
                </div>
            </div>
        `;
    }
    
    function renderWeeklySchedule() {
        return `
            <div class="weekly-schedule mt-6">
                <h4 class="font-semibold mb-3 text-gray-800">Weekly Schedule</h4>
                <div class="schedule-grid grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div class="schedule-day p-3 bg-gray-100 rounded text-center">
                        <div class="font-medium text-sm">Monday</div>
                        <div class="text-xs text-gray-600">Push</div>
                    </div>
                    <div class="schedule-day p-3 bg-gray-100 rounded text-center">
                        <div class="font-medium text-sm">Tuesday</div>
                        <div class="text-xs text-gray-600">Pull</div>
                    </div>
                    <div class="schedule-day p-3 bg-gray-100 rounded text-center">
                        <div class="font-medium text-sm">Wednesday</div>
                        <div class="text-xs text-gray-600">Legs</div>
                    </div>
                    <div class="schedule-day p-3 bg-gray-100 rounded text-center">
                        <div class="font-medium text-sm">Thursday</div>
                        <div class="text-xs text-gray-600">Rest</div>
                    </div>
                    <div class="schedule-day p-3 bg-gray-100 rounded text-center">
                        <div class="font-medium text-sm">Friday</div>
                        <div class="text-xs text-gray-600">Push</div>
                    </div>
                    <div class="schedule-day p-3 bg-gray-100 rounded text-center">
                        <div class="font-medium text-sm">Saturday</div>
                        <div class="text-xs text-gray-600">Pull</div>
                    </div>
                    <div class="schedule-day p-3 bg-gray-100 rounded text-center">
                        <div class="font-medium text-sm">Sunday</div>
                        <div class="text-xs text-gray-600">Legs</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Initialize the app
    setupModals();
    
    // Set life pointer
    const lifePointers = [
        "Just be there like a tree", "30 minute work quantums", "Director or Actor ?", "Try first", 
        "Don't take your mind seriously", "It's not about me!", "Never steal the thunder", 
        "Night divides the day", "Only person that can help you is YOU", "All IN"
    ];
    
    const lifePointerEl = document.getElementById('life-pointer-display-day');
    if (lifePointerEl) {
        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        lifePointerEl.textContent = lifePointers[(dayOfYear - 1) % lifePointers.length];
    }
    
    console.log('App setup complete!');
});
