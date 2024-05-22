#include <iostream>
#include <zmq.hpp>
#include <dotenv.h>
#include <thread>
#include <future>
#include <rapidjson/document.h>
#include <rapidjson/writer.h>
#include <rapidjson/stringbuffer.h>

using namespace std;
using namespace zmq;
using namespace rapidjson;

void StoreAlerts(context_t *ctx) {
    socket_t writerSocket(*ctx, socket_type::rep);
    string address = "tcp://";
    address += getenv("FOGLAYER_IP"); address += ":5560";
    writerSocket.bind(address);
    while (1) {
        message_t message;
        writerSocket.recv(message);
        cout << message.str() << endl;
        writerSocket.send(str_buffer("ok"));
    }
}

int main() {
    dotenv::init();

    context_t ctx(2);

    auto writerThread = async(launch::async, StoreAlerts, &ctx);

    writerThread.wait();
}