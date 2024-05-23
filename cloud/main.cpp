#include <iostream>
#include <zmq.hpp>
#include <dotenv.h>
#include <rapidjson/document.h>
#include <rapidjson/stringbuffer.h>
#include <rapidjson/writer.h>
#include <ctime>
#include <chrono>

using namespace std;
using namespace zmq;
using namespace rapidjson;

vector<double> avgs;

void WriteMessageLog(string &line) {
    ofstream file("../storage.txt", ios::app);
    if (!file) return;
    file << line << "\n";
    file.close();
}

void MessageToQualitySystem(double value) {
    // Connecting socket
    context_t ctx;
    socket_t quality(ctx, socket_type::req);
    string address = "tcp://";
    address += getenv("SCCLOUD_IP"); address += ":5561";
    quality.connect(address);

    time_t now = time(0);

    StringBuffer sb;
    Writer<StringBuffer> writer(sb);

    writer.StartObject();
    writer.Key("content"); writer.String("Humidity alert");
    writer.Key("value"); writer.Double(value);
    writer.Key("timestamp"); writer.String(string(ctime(&now)).c_str());
    writer.EndObject();

    string JSONString = string(sb.GetString());
    message_t msg(JSONString);
    quality.send(msg, send_flags::none);
    quality.recv(msg);
    cout << "CSCloud " << msg.to_string() << endl;
    quality.close();
}

void EvalAverage(double average) {
    avgs.push_back(average);
    if ((int) avgs.size() == 4) {
        double sum = 0;
        while ((int) avgs.size()) {
            sum += avgs.back();
            avgs.pop_back();
        }
        double calc = (sum/4)*100;
        if (calc < 70 || calc > 100) {
            MessageToQualitySystem(calc);
        }
    }
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
        chrono::milliseconds ms = chrono::duration_cast< chrono::milliseconds >(
                chrono::system_clock::now().time_since_epoch()
                );
        cout << ms.count() << endl;
        string msgStr = message.to_string();
        cout << msgStr << endl;
        Document json;
        bool ok = true;
        if (json.Parse(message.to_string().c_str()).HasParseError()) {
            cout << "El JSON esta mal formado!\n";
            ok = false;
        } else {
            WriteMessageLog(msgStr);
        }
        if (ok && json["type"] == "humidity") EvalAverage(json["data"]["average"].GetDouble());
        writerSocket.send(str_buffer("ok"));
    }
}


int main() {
    dotenv::init();
    StoreAlerts();
}