#!/bin/bash

# Function to prompt for user confirmation
confirm() {
    read -r -p "$1 [y/N] " response
    case "$response" in
        [yY][eE][sS]|[yY]) 
            true
            ;;
        *)
            false
            ;;
    esac
}

# Install Homebrew if not installed
if ! command -v brew &> /dev/null; then
    echo "Homebrew not found. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Update and upgrade Homebrew
if confirm "Do you want to update and upgrade Homebrew?"; then
    echo "Updating Homebrew..."
    brew update
    brew upgrade
fi

# Install essential packages
if confirm "Do you want to install essential packages (git, wget, tree, htop)?"; then
    echo "Installing essential packages..."
    brew install git
    brew install wget
    brew install tree
    brew install htop
fi

# Install nvm (Node Version Manager)
if confirm "Do you want to install nvm (Node Version Manager)?"; then
    echo "Installing nvm..."
    brew install nvm
    mkdir ~/.nvm
    echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
    echo '[ -s "/usr/local/opt/nvm/nvm.sh" ] && \. "/usr/local/opt/nvm/nvm.sh"' >> ~/.zshrc
    echo '[ -s "/usr/local/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/usr/local/opt/nvm/etc/bash_completion.d/nvm"' >> ~/.zshrc
    source ~/.zshrc
fi

# Install uv (a lightweight task runner)
if confirm "Do you want to install uv (An extremely fast Python package and project manager, written in Rust.)?"; then
    echo "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
fi

# Install Oh My Zsh
if confirm "Do you want to install Oh My Zsh?"; then
    echo "Installing Oh My Zsh..."
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
    echo "Installing figlet and lolcat..."
    brew install figlet
    brew install lolcat
    echo "Installing jq..."
    brew install jq
fi

# Install Zsh plugins and themes
if confirm "Do you want to install Zsh plugins and themes?"; then
    echo "Installing Zsh plugins and themes..."
    git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
    git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
    sed -i '' 's/plugins=(git)/plugins=(git zsh-syntax-highlighting zsh-autosuggestions)/' ~/.zshrc
    source ~/.zshrc
fi

# Install Neovim
if confirm "Do you want to install Neovim?"; then
    echo "Installing Neovim..."
    brew install neovim
    mkdir -p ~/.config/nvim
    cat <<EOL > ~/.config/nvim/init.vim
" Basic Neovim configuration
set number
syntax on
set tabstop=4
set shiftwidth=4
set expandtab

" Install vim-plug for managing plugins
call plug#begin('~/.vim/plugged')
Plug 'junegunn/vim-easy-align'
Plug 'scrooloose/nerdtree'
Plug 'tpope/vim-fugitive'
Plug 'airblade/vim-gitgutter'
Plug 'junegunn/fzf', { 'do': { -> fzf#install() } }
Plug 'junegunn/fzf.vim'
call plug#end()

" Key mappings
nmap <C-n> :NERDTreeToggle<CR>
EOL
    nvim +PlugInstall +qall
fi

echo "Installation complete!"