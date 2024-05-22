#include <iostream>
#include <zmq.hpp>
#include <dotenv.h>
#include <thread>
#include <future>
#include <rapidjson/document.h>
#include <rapidjson/prettywriter.h>
#include <rapidjson/stringbuffer.h>
#include <rapidjson/writer.h>
#include <ctime>

using namespace std;
using namespace zmq;
using namespace rapidjson;

void MessageToQualitySystem() {
    // Connecting socket
    context_t ctx;
    socket_t quality(ctx, socket_type::req);
    string address = "tcp://";
    address += getenv("SCCLOUD_IP"); address += ":5559";
    quality.connect(address);

    // Sending message
    //Document json;
    time_t now = time(0);

    StringBuffer sb;
    Writer<StringBuffer> writer(sb);

    writer.StartObject();
    writer.Key("content"); writer.String("Humidity alert");
    writer.Key("timestamp"); writer.String(string(ctime(&now)).c_str());
    writer.EndObject();

    string JSONString = string(sb.GetString());
    message_t msg(JSONString);
    quality.send(msg, send_flags::none);
    quality.recv(msg);
    cout << "CSCloud " << msg.to_string() << endl;
    quality.close();
}

void StoreAlerts() {
    context_t ctx;
    socket_t writerSocket(ctx, socket_type::rep);
    string address = "tcp://";
    address += getenv("FOGLAYER_IP"); address += ":5560";
    writerSocket.bind(address);
    while (1) {
        message_t message;
        writerSocket.recv(message);
        cout << message.to_string() << endl;
        Document json;
        bool ok = true;
        if (json.Parse(message.to_string().c_str()).HasParseError()) {
            cout << "El JSON esta mal formado!\n";
            ok = false;
        } else {
            cout << json["hola"].GetString() << endl;
            cout << json["pirujo"].GetString() << endl;
        }
        if (ok && json["pirujo"] == "carechimba") MessageToQualitySystem();
        writerSocket.send(str_buffer("ok"));
    }
}


int main() {
    dotenv::init();
    StoreAlerts();
}