# Test C++ ZeroMQ

Los pasos para compilar y ejecutar el código son los siguientes:

## Instalación de ccpzmq

Build steps:

1. Build [libzmq](https://github.com/zeromq/libzmq) via cmake. This does an out of source build and installs the build files
   - git clone https://github.com/zeromq/libzmq
   - cd libzmq
   - mkdir build
   - cd build
   - cmake ..
   - sudo make -j4 install

2. Build cppzmq via cmake. This does an out of source build and installs the build files
   - git clone https://github.com/zeromq/cppzmq.git
   - cd cppzmq
   - mkdir build
   - cd build
   - cmake ..
   - sudo make -j4 install

3. Build cppzmq via [vcpkg](https://github.com/Microsoft/vcpkg/). This does an out of source build and installs the build files
   - git clone https://github.com/Microsoft/vcpkg.git
   - cd vcpkg
   - ./bootstrap-vcpkg.sh # bootstrap-vcpkg.bat for Powershell
   - ./vcpkg integrate install
   - ./vcpkg install cppzmq

Using this:

A cmake find package scripts is provided for you to easily include this library.
Add these lines in your **CMakeLists.txt** to include the headers and library files of
cpp zmq (which will also include libzmq for you).

```
#find cppzmq wrapper, installed by make of cppzmq
find_package(cppzmq)
target_link_libraries(*Your Project Name* cppzmq)
```

## Instalación de Dotenv

Para la instalación de Dotenv se tiene que seguir los siguientes pasos: 

1. For install Dotenv
    - git clone https://github.com/laserpants/dotenv-cpp
    - cd dotenv-cpp
    - mkdir -p build
    - cd build
    - cmake ..
    - make
    - sudo make install

Hay que añadir esto al **CMakeLists.txt**:

```
find_package(laserpants_dotenv)
target_link_libraries(*Project name* laserpants::dotenv)
```

Importante tener el .env en la carpeta build

## Instalacion de RapidJSON

1. For install RapidJSON
   - git clone https://github.com/Tencent/rapidjson/tree/master
   - cd rapidjson
   - mkdir -p build
   - cd build
   - cmake ..
   - make
   - sudo make install

## Ejecutar el programa

1. Hacer un directorio build

```bash
mkdir build
cd build
```

2. Ejecutar el cmake para generar el Makefile
```bash
cmake ..
```

3. Ejecutar el make para compilar el código
```bash
make
```

4. Ejecutar el código
```bash
./nombre_del_ejecutable
```

Sin embargo, con el Clion se puede ejecutar el codigo.