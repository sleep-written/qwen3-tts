pyenv install -s 3.12;
pyenv global 3.12;

cd inference-asr;
./install.sh;

cd ../inference-tts;
./install.sh;

cd ..
npm ci;