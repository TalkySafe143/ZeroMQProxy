FROM ubuntu:latest
LABEL authors="talkysafe143"

COPY . /usr/src

RUN apt-get update && apt-get -y install build-essential cmake protobuf-compiler make git clang curl zip unzip tar pkg-config

WORKDIR /usr/lib/
RUN git clone https://github.com/zeromq/libzmq && cd libzmq && mkdir build && cd build && cmake .. && make -j4 install

WORKDIR /usr/lib/
RUN git clone https://github.com/zeromq/cppzmq.git && cd cppzmq && mkdir build && cd build && cmake .. && make -j4 install

WORKDIR /usr/lib/
RUN git clone https://github.com/laserpants/dotenv-cpp && cd dotenv-cpp && mkdir -p build && cd build && cmake .. && make install

WORKDIR /usr/lib/
RUN git clone https://github.com/Tencent/rapidjson.git && cd rapidjson && mkdir build && cd build && cmake .. && make install

WORKDIR /usr/src
RUN cd build && rm * -r && touch .env && cmake .. && make

ENV FOGLAYER_IP host.docker.internal
ENV SCCLOUD_IP host.docker.internal

ENTRYPOINT ["./build/cloud"]