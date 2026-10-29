const form = document.getElementById("taskForm");
const taskName = document.getElementById("taskName");
const dueDate = document.getElementById("dueDate");
const priority = document.getElementById("priority");
const category = document.getElementById("category");
const taskList = document.getElementById("taskList");
const search = document.getElementById("search");
const sort = document.getElementById("sort");
const themeBtn = document.getElementById("themeBtn");

let tasks = [];

try {
    tasks = JSON.parse(localStorage.getItem("tasks")) || [];
} catch (error) {
    tasks = [];
}

let editingId = null;
let currentFilter = "All";
let draggedId = null;


function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}


function updateStats() {
    const completedTasks = tasks.filter(t => t.completed).length;

    document.getElementById("total").textContent = tasks.length;
    document.getElementById("completed").textContent = completedTasks;
    document.getElementById("pending").textContent =
        tasks.length - completedTasks;
}


function isOverdue(task) {
    if (!task.dueDate || task.completed) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return new Date(task.dueDate + "T00:00:00") < today;
}


form.addEventListener("submit", function(event) {
    event.preventDefault();

    const name = taskName.value.trim();
    if (!name) return;

    if (editingId !== null) {
        const task = tasks.find(t => t.id === editingId);

        if (task) {
            task.name = name;
            task.dueDate = dueDate.value;
            task.priority = priority.value;
            task.category = category.value;
        }

        editingId = null;
        document.getElementById("addBtn").textContent = "＋ Add Task";
    } else {
        tasks.unshift({
            id: Date.now(),
            name: name,
            dueDate: dueDate.value,
            priority: priority.value,
            category: category.value,
            completed: false
        });
    }

    form.reset();
    priority.value = "Medium";
    category.value = "Homework";

    saveTasks();
    renderTasks();
});


function renderTasks() {
    taskList.replaceChildren();

    const query = search.value.trim().toLowerCase();

    let visibleTasks = tasks.filter(task => {
        const matchesName = task.name.toLowerCase().includes(query);

        const matchesStatus =
            currentFilter === "All" ||
            (currentFilter === "Completed" && task.completed) ||
            (currentFilter === "Pending" && !task.completed);

        return matchesName && matchesStatus;
    });

    if (sort.value === "dueDate") {
        visibleTasks.sort((a, b) => {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;

            return a.dueDate.localeCompare(b.dueDate);
        });
    }

    if (sort.value === "priority") {
        const rank = { High: 3, Medium: 2, Low: 1 };

        visibleTasks.sort((a, b) =>
            rank[b.priority] - rank[a.priority]
        );
    }

    visibleTasks.forEach(task => {
        const card = document.createElement("div");
        card.className = "task";
        card.draggable = true;
        card.dataset.id = task.id;

        
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.completed;
        checkbox.setAttribute("aria-label", "Complete task");

        checkbox.addEventListener("change", function() {
            task.completed = checkbox.checked;
            saveTasks();
            renderTasks();
        });

        
        const info = document.createElement("div");
        info.className = "task-info";

        if (task.completed) {
            info.classList.add("completed");
        }

        const title = document.createElement("strong");
        title.className = "task-name";
        title.textContent = task.name;
        info.appendChild(title);

        const tags = document.createElement("div");
        tags.className = "task-tags";

        const categoryTag = document.createElement("span");
        categoryTag.className = "tag category-" + task.category;
        categoryTag.textContent = task.category;

        const priorityTag = document.createElement("span");
        priorityTag.className = "tag priority-" + task.priority;
        priorityTag.textContent = task.priority + " Priority";

        tags.append(categoryTag, priorityTag);
        info.appendChild(tags);

        const date = document.createElement("p");
        date.className = "due-date";

        if (task.dueDate) {
            date.textContent = "Due: " + task.dueDate;

            if (isOverdue(task)) {
                date.textContent += " — OVERDUE";
                date.classList.add("overdue");
            }
        } else {
            date.textContent = "No due date";
        }

        info.appendChild(date);

        
        const actions = document.createElement("div");
        actions.className = "task-actions";

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "edit-btn";
        editBtn.textContent = "✎ Edit";

        editBtn.addEventListener("click", function() {
            taskName.value = task.name;
            dueDate.value = task.dueDate || "";
            priority.value = task.priority;
            category.value = task.category;

            editingId = task.id;
            document.getElementById("addBtn").textContent =
                "Save Changes";

            taskName.focus();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "delete-btn";
        deleteBtn.textContent = "🗑 Delete";

        deleteBtn.addEventListener("click", function() {
            if (!confirm("Are you sure you want to delete this task?")) {
                return;
            }

            tasks = tasks.filter(t => t.id !== task.id);

            if (editingId === task.id) {
                editingId = null;
                form.reset();
                document.getElementById("addBtn").textContent =
                    "＋ Add Task";
            }

            saveTasks();
            renderTasks();
        });

        actions.append(editBtn, deleteBtn);
        card.append(checkbox, info, actions);

    
        card.addEventListener("dragstart", function(event) {
            draggedId = task.id;
            card.classList.add("dragging");

            event.dataTransfer.setData("text/plain", String(task.id));
        });

        card.addEventListener("dragover", function(event) {
            event.preventDefault();

            if (draggedId !== task.id) {
                card.classList.add("drag-over");
            }
        });

        card.addEventListener("dragleave", function() {
            card.classList.remove("drag-over");
        });

        card.addEventListener("drop", function(event) {
            event.preventDefault();
            card.classList.remove("drag-over");

            const sourceId = Number(
                event.dataTransfer.getData("text/plain")
            );

            if (!sourceId || sourceId === task.id) return;

            const from = tasks.findIndex(t => t.id === sourceId);
            const to = tasks.findIndex(t => t.id === task.id);

            if (from !== -1 && to !== -1) {
                const movedTask = tasks.splice(from, 1)[0];
                tasks.splice(to, 0, movedTask);

                saveTasks();
                renderTasks();
            }
        });

        card.addEventListener("dragend", function() {
            draggedId = null;

            document.querySelectorAll(".task").forEach(item => {
                item.classList.remove("dragging", "drag-over");
            });
        });

        taskList.appendChild(card);
    });

    document.getElementById("emptyState").classList.toggle(
        "show", visibleTasks.length === 0
    );

    document.getElementById("taskCount").textContent =
        "Showing " + visibleTasks.length +
        (visibleTasks.length === 1 ? " task" : " tasks");

    updateStats();
}

search.addEventListener("input", renderTasks);


sort.addEventListener("change", renderTasks);


document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", function() {
        currentFilter = button.dataset.status;

        document.querySelectorAll(".filter-btn").forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");
        renderTasks();
    });
});


function setTheme(isDark) {
    document.body.classList.toggle("dark", isDark);

    themeBtn.setAttribute("aria-pressed", String(isDark));

    localStorage.setItem("darkMode", String(isDark));
}

themeBtn.addEventListener("click", function() {
    const isDark = !document.body.classList.contains("dark");
    setTheme(isDark);
});


setTheme(localStorage.getItem("darkMode") === "true");


renderTasks();