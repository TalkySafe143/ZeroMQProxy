cmake_minimum_required(VERSION 3.5)
project(cloud)
set(CMAKE_CXX_STANDARD 14)

find_package(cppzmq CONFIG REQUIRED)
find_package(laserpants_dotenv CONFIG REQUIRED)
find_package(RapidJSON)

add_executable(cloud main.cpp)
set(nlohmann-json_IMPLICIT_CONVERSIONS OFF)
target_link_libraries(cloud PRIVATE cppzmq cppzmq-static laserpants::dotenv RapidJSON)