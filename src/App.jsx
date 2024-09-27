import { createSignal, onMount, createEffect, For, Show } from 'solid-js';
import { supabase, createEvent } from './supabaseClient';
import { Auth } from '@supabase/auth-ui-solid';
import { ThemeSupa } from '@supabase/auth-ui-shared';

function App() {
  const [tasks, setTasks] = createSignal([]);
  const [newTask, setNewTask] = createSignal('');
  const [user, setUser] = createSignal(null);
  const [currentPage, setCurrentPage] = createSignal('login');
  const [loading, setLoading] = createSignal(false);
  const [aiSuggestions, setAiSuggestions] = createSignal([]);
  const [selectedSuggestions, setSelectedSuggestions] = createSignal([]);

  const checkUserSignedIn = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      setCurrentPage('homePage');
    }
  };

  onMount(checkUserSignedIn);

  createEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setUser(session.user);
        setCurrentPage('homePage');
      } else {
        setUser(null);
        setCurrentPage('login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentPage('login');
  };

  const fetchTasks = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/getTasks', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    if (response.ok) {
      const data = await response.json();
      setTasks(data);
    } else {
      console.error('Error fetching tasks:', response.statusText);
    }
  };

  const saveTask = async (e) => {
    e.preventDefault();
    if (!newTask()) return;
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const response = await fetch('/api/saveTask', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: newTask() }),
      });
      if (response.ok) {
        const savedTask = await response.json();
        setTasks([savedTask, ...tasks()]);
        setNewTask('');
      } else {
        console.error('Error saving task');
      }
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (id, completed) => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const response = await fetch('/api/updateTask', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, completed }),
      });
      if (response.ok) {
        setTasks(tasks().map(task => task.id === id ? { ...task, completed } : task));
      } else {
        console.error('Error updating task');
      }
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (id) => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const response = await fetch('/api/deleteTask', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });
      if (response.ok) {
        setTasks(tasks().filter(task => task.id !== id));
      } else {
        console.error('Error deleting task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetAiSuggestions = async () => {
    setLoading(true);
    try {
      const existingTasks = tasks().map(task => task.description).join(', ');
      const prompt = `Based on the tasks: ${existingTasks}, suggest five new tasks I should add to my todo list in JSON array format with property "suggestions".`;
      const result = await createEvent('chatgpt_request', {
        prompt,
        response_type: 'json'
      });
      setAiSuggestions(result.suggestions || []);
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSelectedSuggestions = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const tasksToAdd = selectedSuggestions().map(description => ({ description }));
      for (let task of tasksToAdd) {
        const response = await fetch('/api/saveTask', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(task),
        });
        if (response.ok) {
          const savedTask = await response.json();
          setTasks([savedTask, ...tasks()]);
        } else {
          console.error('Error saving task');
        }
      }
      setAiSuggestions([]);
      setSelectedSuggestions([]);
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    if (!user()) return;
    fetchTasks();
  });

  return (
    <div class="h-full flex flex-col bg-gradient-to-br from-green-100 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4 text-gray-800 dark:text-gray-200">
      <Show
        when={currentPage() === 'homePage'}
        fallback={
          <div class="flex items-center justify-center flex-grow">
            <div class="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
              <h2 class="text-3xl font-bold mb-6 text-center text-green-600 dark:text-green-400">Sign in with ZAPT</h2>
              <a
                href="https://www.zapt.ai"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-500 dark:text-blue-400 hover:underline mb-6 block text-center"
              >
                Learn more about ZAPT
              </a>
              <Auth
                supabaseClient={supabase}
                appearance={{ theme: ThemeSupa }}
                providers={['google', 'facebook', 'apple']}
                magicLink={true}
              />
            </div>
          </div>
        }
      >
        <div class="flex flex-col flex-grow max-w-4xl mx-auto">
          <div class="flex justify-between items-center mb-8">
            <h1 class="text-4xl font-bold text-green-600 dark:text-green-400">Smart Todo List</h1>
            <button
              class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-6 rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-red-400 transition duration-300 ease-in-out transform hover:scale-105 cursor-pointer"
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </div>

          <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
            <form onSubmit={saveTask} class="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <input
                type="text"
                placeholder="New Task"
                value={newTask()}
                onInput={(e) => setNewTask(e.target.value)}
                class="flex-1 p-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent box-border text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700"
                required
              />
              <div class="flex space-x-4">
                <button
                  type="submit"
                  class={`px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition duration-300 ease-in-out transform hover:scale-105 cursor-pointer ${loading() ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={loading()}
                >
                  <Show when={loading() && !aiSuggestions().length}>Saving...</Show>
                  <Show when={!loading() || aiSuggestions().length}>Save Task</Show>
                </button>
                <button
                  type="button"
                  class={`px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-300 ease-in-out transform hover:scale-105 cursor-pointer ${loading() ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={handleGetAiSuggestions}
                  disabled={loading()}
                >
                  <Show when={loading() && aiSuggestions().length}>Generating...</Show>
                  <Show when={!loading() || !aiSuggestions().length}>Get AI Suggestions</Show>
                </button>
              </div>
            </form>
          </div>

          <Show when={aiSuggestions().length}>
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
              <h2 class="text-2xl font-bold mb-4 text-green-600 dark:text-green-400">AI Suggestions</h2>
              <For each={aiSuggestions()}>
                {(suggestion) => (
                  <div class="flex items-center mb-2">
                    <input
                      type="checkbox"
                      checked={selectedSuggestions().includes(suggestion)}
                      onInput={(e) => {
                        const checked = e.target.checked;
                        if (checked) {
                          setSelectedSuggestions([...selectedSuggestions(), suggestion]);
                        } else {
                          setSelectedSuggestions(selectedSuggestions().filter(item => item !== suggestion));
                        }
                      }}
                      class="mr-2 cursor-pointer"
                    />
                    <span>{suggestion}</span>
                  </div>
                )}
              </For>
              <button
                onClick={addSelectedSuggestions}
                class={`mt-4 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition duration-300 ease-in-out transform hover:scale-105 cursor-pointer ${loading() ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={loading()}
              >
                <Show when={loading()}>Adding...</Show>
                <Show when={!loading()}>Add Selected Tasks</Show>
              </button>
            </div>
          </Show>

          <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex-grow">
            <h2 class="text-2xl font-bold mb-4 text-green-600 dark:text-green-400">Your Tasks</h2>
            <Show when={tasks().length} fallback={<p>No tasks available.</p>}>
              <For each={tasks()}>
                {(task) => (
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onInput={(e) => updateTask(task.id, e.target.checked)}
                        class="mr-2 cursor-pointer"
                      />
                      <span class={`${task.completed ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>{task.description}</span>
                    </div>
                    <button
                      onClick={() => deleteTask(task.id)}
                      class={`text-red-500 hover:text-red-600 transition duration-300 ease-in-out transform hover:scale-105 cursor-pointer ${loading() ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={loading()}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}

export default App;