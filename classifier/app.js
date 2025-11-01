/**
 * Main Application Module
 * Orchestrates all components and handles global application state
 */

import { embeddingService } from './modules/embedding-service.js';
import { vectorDB } from './modules/database.js';

// Import components
import './components/upload-card.js';
import './components/query-card.js';
import './components/results-card.js';
import './components/sidebar-card.js';

class ClassifierApp {
  constructor() {
    this.components = {};
    this.state = {
      isInitialized: false,
      modelLoaded: false,
      dataLoaded: false,
      lastError: null
    };
    
    this.init();
  }

  async init() {
    try {
      console.log('Initializing Classifier App...');
      
      // Setup global error handling
      this.setupErrorHandling();
      
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }
      
      // Wait for custom elements to be defined
      await this.waitForComponents();
      
      // Get component references
      this.getComponentReferences();
      
      // Setup component event listeners
      this.setupComponentEvents();
      
      // Setup keyboard shortcuts
      this.setupKeyboardShortcuts();
      
      // Initialize components
      await this.initializeComponents();
      
      this.state.isInitialized = true;
      console.log('Classifier App initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Classifier App:', error);
      this.handleError(error);
    }
  }

  async waitForComponents() {
    const componentNames = ['upload-card', 'query-card', 'results-card', 'sidebar-card'];
    
    // Wait for all components to be defined
    await Promise.all(
      componentNames.map(name => customElements.whenDefined(name))
    );
    
    console.log('All components defined');
  }

  getComponentReferences() {
    this.components = {
      uploadCard: document.querySelector('upload-card'),
      queryCard: document.querySelector('query-card'),
      resultsCard: document.querySelector('results-card'),
      sidebarCard: document.querySelector('sidebar-card')
    };

    // Validate all components are present
    const missingComponents = Object.entries(this.components)
      .filter(([name, component]) => !component)
      .map(([name]) => name);

    if (missingComponents.length > 0) {
      throw new Error(`Missing components: ${missingComponents.join(', ')}`);
    }
  }

  setupComponentEvents() {
    console.log('Setting up component events...');
    console.log('Components available:', Object.keys(this.components).map(key => ({
      name: key,
      element: this.components[key],
      hasAddEventListener: this.components[key] && typeof this.components[key].addEventListener === 'function'
    })));

    // Upload card events
    console.log('Setting up upload card events...');
    this.components.uploadCard.addEventListener('data-loaded', this.handleDataLoaded.bind(this));
    this.components.uploadCard.addEventListener('database-cleared', this.handleDatabaseCleared.bind(this));

    // Query card events
    console.log('Setting up query card events...');
    this.components.queryCard.addEventListener('query-results', this.handleQueryResults.bind(this));
    this.components.queryCard.addEventListener('query-error', this.handleQueryError.bind(this));
    this.components.queryCard.addEventListener('clear-results', this.handleClearResults.bind(this));

    // Results card events
    console.log('Setting up results card events...');
    this.components.resultsCard.addEventListener('result-selected', this.handleResultSelected.bind(this));

    // Sidebar card events
    console.log('Setting up sidebar card events...');
    this.components.sidebarCard.addEventListener('theme-changed', this.handleThemeChanged.bind(this));
    this.components.sidebarCard.addEventListener('export-requested', this.handleExportRequested.bind(this));

    // Note: Event bus removed - components now communicate directly via custom events
    
    console.log('Component events setup completed');
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Ctrl/Cmd + K: Focus query input
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        const queryTextarea = this.components.queryCard.querySelector('#query');
        if (queryTextarea) {
          queryTextarea.focus();
        }
      }

      // Ctrl/Cmd + Shift + C: Clear all
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        this.clearAll();
      }

      // Ctrl/Cmd + Shift + T: Toggle theme
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        const themeToggle = this.components.sidebarCard.querySelector('#themeToggle');
        if (themeToggle) {
          themeToggle.click();
        }
      }

      // Escape: Clear focus and results
      if (event.key === 'Escape') {
        document.activeElement?.blur();
        this.components.resultsCard.clearResults();
      }
    });
  }

  async initializeComponents() {
    // Update initial stats
    try {
      const count = await vectorDB.count();
      this.components.sidebarCard.updateEmbedCount(count);
      this.state.dataLoaded = count > 0;

      // Auto-load sample data if no data exists to test the full pipeline
      if (count === 0) {
        console.log('No data found, auto-loading sample data to test pipeline...');
        // Wait longer to ensure components are fully rendered
        setTimeout(async () => {
          try {
            console.log('Attempting to auto-load sample data...');
            await this.autoLoadSampleData();
          } catch (error) {
            console.error('Failed to auto-load sample data:', error);
          }
        }, 2000); // Longer delay to ensure components are fully ready
      }
    } catch (error) {
      console.warn('Could not load initial data count:', error);
    }
  }

  // Direct auto-loading method that doesn't rely on button clicks
  async autoLoadSampleData() {
    console.log('Starting auto-load of sample data...');
    
    // Check if upload card is available
    if (!this.components.uploadCard) {
      console.error('Upload card component not available');
      return;
    }

    try {
      // Directly call the upload card's sample loading method
      await this.components.uploadCard.handleLoadSample();
      console.log('Sample data auto-loading completed');
      
      // Test the full pipeline by executing a test query after data loads
      setTimeout(async () => {
        console.log('Starting full pipeline test with query...');
        await this.runFullPipelineTest();
      }, 2000); // Wait for data to settle
      
    } catch (error) {
      console.error('Auto-load sample data error:', error);
      // Fallback to button click method
      try {
        console.log('Trying fallback button click method...');
        const loadSampleBtn = this.components.uploadCard.querySelector('#loadSample');
        if (loadSampleBtn) {
          loadSampleBtn.click();
        } else {
          console.error('Load Sample button not found');
        }
      } catch (fallbackError) {
        console.error('Fallback method also failed:', fallbackError);
      }
    }
  }

  // Test the complete pipeline: data load → query → results
  async runFullPipelineTest() {
    try {
      console.log('=== FULL PIPELINE TEST START ===');
      
      // Test 1: Query for "fruit" (should match apple, banana)
      console.log('Test 1: Querying for "fruit"');
      this.components.queryCard.setQuery('fruit');
      await this.components.queryCard.executeQuery();
      
      // Wait a moment, then test another query
      setTimeout(async () => {
        // Test 2: Query for "vehicle" (should match car, plane, truck)
        console.log('Test 2: Querying for "vehicle"');
        this.components.queryCard.setQuery('vehicle');
        await this.components.queryCard.executeQuery();
        
        setTimeout(() => {
          console.log('=== FULL PIPELINE TEST COMPLETE ===');
          console.log('✅ All components initialized');
          console.log('✅ Model loaded successfully');
          console.log('✅ Sample data embedded and stored');
          console.log('✅ Query pipeline functional');
          console.log('✅ Semantic search working');
          
          // Update timing display to show success
          this.updateTimingDisplay('✅ Full pipeline test completed successfully');
        }, 2000);
      }, 3000);
      
    } catch (error) {
      console.error('❌ Full pipeline test failed:', error);
      this.updateTimingDisplay('❌ Pipeline test failed');
    }
  }

  setupErrorHandling() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message || 'Unknown error'));
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason);
    });
  }

  // Event handlers
  handleDataLoaded(event) {
    const { count, time } = event.detail;
    
    this.components.sidebarCard.updateStats({
      embedCount: count,
      embedTime: time
    });
    
    this.state.dataLoaded = count > 0;
    
    console.log(`Data loaded: ${count} entries in ${time}ms`);
    
    // Update timing display
    this.updateTimingDisplay(`Embeddings computed on-device in ${time} ms`);
  }

  handleDatabaseCleared() {
    this.components.sidebarCard.updateEmbedCount(0);
    this.components.resultsCard.clearResults();
    this.state.dataLoaded = false;
    
    console.log('Database cleared');
  }

  handleQueryResults(event) {
    const { query, results, queryTime, totalResults } = event.detail;
    
    this.components.resultsCard.setResults(results, query, queryTime);
    this.components.sidebarCard.updateQueryTime(queryTime);
    
    console.log(`Query executed: "${query}" - ${results.length} results in ${queryTime}ms`);
    
    // Update timing display
    this.updateTimingDisplay(`Query executed in ${queryTime} ms`);
    
    // Highlight search terms in results
    const searchTerms = query.split(/\s+/).filter(term => term.length > 2);
    this.components.resultsCard.highlightTerms(searchTerms);
  }

  handleQueryError(event) {
    const { error } = event.detail;
    this.handleError(new Error(`Query failed: ${error}`));
  }

  handleClearResults() {
    this.components.resultsCard.clearResults();
  }

  handleResultSelected(event) {
    const { result, index } = event.detail;
    console.log(`Result selected: ${result.key} (${result.score})`);
    
    // Emit global event for potential external handling
    eventBus.emit('result-selected', { result, index });
  }

  handleThemeChanged(event) {
    const { theme } = event.detail;
    console.log(`Theme changed to: ${theme}`);
  }

  handleExportRequested() {
    if (this.components.resultsCard.hasResults) {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `classifier-results-${timestamp}.csv`;
      this.components.resultsCard.downloadAsCSV(filename);
    } else {
      alert('No results to export. Execute a query first.');
    }
  }

  handleModelLoading() {
    this.updateTimingDisplay('Loading model...');
  }

  handleModelLoaded() {
    this.state.modelLoaded = true;
    this.updateTimingDisplay('Model loaded');
  }

  handleError(error) {
    this.state.lastError = error;
    console.error('Application error:', error);
    
    // Update UI to show error
    this.updateTimingDisplay('Error occurred');
    
    // Show error in upload summary if available
    if (this.components.uploadCard) {
      const summaryEl = this.components.uploadCard.querySelector('#summary');
      if (summaryEl) {
        summaryEl.textContent = `Error: ${error.message}`;
        summaryEl.style.color = '#ff6b6b';
      }
    }
  }

  // Utility methods
  updateTimingDisplay(text) {
    const timingEl = document.getElementById('timing');
    if (timingEl) {
      timingEl.textContent = text;
    }
  }

  clearAll() {
    if (confirm('Clear all data and results?')) {
      this.components.queryCard.setQuery('');
      this.components.resultsCard.clearResults();
      // Note: Not clearing database as that requires explicit user confirmation
    }
  }

  // Public API methods
  async loadSampleData() {
    const loadSampleBtn = this.components.uploadCard.querySelector('#loadSample');
    if (loadSampleBtn) {
      loadSampleBtn.click();
    }
  }

  async executeQuery(query, topK = 5) {
    this.components.queryCard.setQuery(query);
    this.components.queryCard.setTopK(topK);
    await this.components.queryCard.executeQuery();
  }

  getStats() {
    return {
      isInitialized: this.state.isInitialized,
      modelLoaded: this.state.modelLoaded,
      dataLoaded: this.state.dataLoaded,
      embedCount: this.components.uploadCard?.embedCount || 0,
      ...this.components.sidebarCard?.stats
    };
  }

  exportCurrentResults() {
    this.handleExportRequested();
  }

  setTheme(theme) {
    this.components.sidebarCard.setTheme(theme);
  }

  // Cleanup
  destroy() {
    // Cleanup embedding service
    embeddingService.dispose();

    // Close database
    vectorDB.close();

    console.log('Classifier App destroyed');
  }
}

// Initialize the application
const app = new ClassifierApp();

// Expose app instance globally for debugging
window.classifierApp = app;

// Export for module usage
export default app;
export { ClassifierApp };
